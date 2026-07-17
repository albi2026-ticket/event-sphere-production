<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Database\Events\ConnectionEstablished;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Http\Request;
use Illuminate\Routing\Events\PreparingResponse;
use Illuminate\Routing\Events\ResponsePrepared;
use Illuminate\Routing\Events\RouteMatched;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class PerformanceProfiler
{
    /**
     * @var array<string, array<string, mixed>>
     */
    private static array $profiles = [];

    private static bool $listenersRegistered = false;

    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! $this->enabled()) {
            return $next($request);
        }

        $uuid = (string) Str::uuid();
        $startedAt = $this->now();
        $laravelStart = defined('LARAVEL_START')
            ? (float) LARAVEL_START
            : (float) ($request->server('REQUEST_TIME_FLOAT') ?: $startedAt);

        $request->attributes->set('performance_profile_uuid', $uuid);
        $this->registerListeners();

        self::$profiles[$uuid] = [
            'uuid' => $uuid,
            'timestamp' => now()->toIso8601String(),
            'method' => $request->method(),
            'url' => $request->getRequestUri(),
            'path' => '/'.ltrim($request->path(), '/'),
            'started_at' => $startedAt,
            'laravel_start' => $laravelStart,
            'handle_started_at' => $startedAt,
            'laravel_boot_ms' => $this->ms($startedAt - $laravelStart),
            'db_connection_established_at' => null,
            'db_connection_name' => null,
            'db_query_time_ms' => 0.0,
            'db_query_count' => 0,
            'route_matched_at' => null,
            'first_preparing_response_at' => null,
            'first_response_prepared_at' => null,
            'response_ready_at' => null,
            'status' => null,
            'exception' => null,
        ];

        try {
            $response = $next($request);
            self::$profiles[$uuid]['status'] = $response->getStatusCode();

            return $response;
        } catch (\Throwable $exception) {
            self::$profiles[$uuid]['exception'] = $exception::class;

            throw $exception;
        } finally {
            if (isset(self::$profiles[$uuid])) {
                self::$profiles[$uuid]['response_ready_at'] = $this->now();
            }
        }
    }

    public function terminate(Request $request, Response $response): void
    {
        $uuid = $request->attributes->get('performance_profile_uuid');

        if (! is_string($uuid) || ! isset(self::$profiles[$uuid])) {
            return;
        }

        $profile = self::$profiles[$uuid];
        $finishedAt = $this->now();
        $responseReadyAt = (float) ($profile['response_ready_at'] ?: $finishedAt);
        $routeMatchedAt = $profile['route_matched_at'];
        $firstPreparingAt = $profile['first_preparing_response_at'];
        $firstPreparedAt = $profile['first_response_prepared_at'];
        $dbConnectedAt = $profile['db_connection_established_at'];

        $routePipelineMs = $routeMatchedAt && $firstPreparingAt
            ? $this->ms($firstPreparingAt - $routeMatchedAt)
            : null;
        $resourceMs = $firstPreparingAt && $firstPreparedAt
            ? $this->ms($firstPreparedAt - $firstPreparingAt)
            : null;
        $controllerApproxMs = $routePipelineMs !== null
            ? round(max(0.0, $routePipelineMs - (float) $profile['db_query_time_ms']), 2)
            : null;

        Log::info($this->formatProfile([
            'uuid' => $profile['uuid'],
            'timestamp' => $profile['timestamp'],
            'method' => $profile['method'],
            'url' => $profile['url'],
            'status' => $profile['status'] ?? $response->getStatusCode(),
            'exception' => $profile['exception'],
            'total_ms' => $this->ms($responseReadyAt - (float) $profile['started_at']),
            'terminate_ms' => $this->ms($finishedAt - (float) $profile['started_at']),
            'after_response_ms' => $this->ms($finishedAt - $responseReadyAt),
            'laravel_boot_ms' => $profile['laravel_boot_ms'],
            'middleware_until_route_ms' => $routeMatchedAt
                ? $this->ms($routeMatchedAt - (float) $profile['handle_started_at'])
                : null,
            'route_pipeline_ms' => $routePipelineMs,
            'database_connect_ms' => $dbConnectedAt
                ? $this->ms($dbConnectedAt - (float) $profile['handle_started_at'])
                : null,
            'database_connection' => $profile['db_connection_name'],
            'database_query_time_ms' => $this->ms((float) $profile['db_query_time_ms']),
            'database_query_count' => (int) $profile['db_query_count'],
            'controller_ms' => $controllerApproxMs,
            'resource_ms' => $resourceMs,
            'memory_mb' => round(memory_get_peak_usage(true) / 1024 / 1024, 2),
        ]));

        unset(self::$profiles[$uuid]);
    }

    private function enabled(): bool
    {
        return app()->environment('production')
            || filter_var(env('APP_DEBUG_PROFILING', false), FILTER_VALIDATE_BOOLEAN);
    }

    private function registerListeners(): void
    {
        if (self::$listenersRegistered) {
            return;
        }

        self::$listenersRegistered = true;

        Event::listen(ConnectionEstablished::class, function (ConnectionEstablished $event): void {
            $this->forActiveProfile(function (array &$profile) use ($event): void {
                if ($profile['db_connection_established_at'] !== null) {
                    return;
                }

                $profile['db_connection_established_at'] = $this->now();
                $profile['db_connection_name'] = $event->connection->getName();
            });
        });

        Event::listen(QueryExecuted::class, function (QueryExecuted $event): void {
            $this->forActiveProfile(function (array &$profile) use ($event): void {
                $profile['db_query_count'] = (int) $profile['db_query_count'] + 1;
                $profile['db_query_time_ms'] = (float) $profile['db_query_time_ms'] + (float) $event->time;
            });
        });

        Event::listen(RouteMatched::class, function (): void {
            $this->forActiveProfile(function (array &$profile): void {
                $profile['route_matched_at'] ??= $this->now();
            });
        });

        Event::listen(PreparingResponse::class, function (): void {
            $this->forActiveProfile(function (array &$profile): void {
                $profile['first_preparing_response_at'] ??= $this->now();
            });
        });

        Event::listen(ResponsePrepared::class, function (): void {
            $this->forActiveProfile(function (array &$profile): void {
                $profile['first_response_prepared_at'] ??= $this->now();
            });
        });
    }

    /**
     * @param  callable(array<string, mixed>&): void  $callback
     */
    private function forActiveProfile(callable $callback): void
    {
        if (self::$profiles === []) {
            return;
        }

        $uuid = array_key_last(self::$profiles);

        if (! is_string($uuid) || ! isset(self::$profiles[$uuid])) {
            return;
        }

        $callback(self::$profiles[$uuid]);
    }

    /**
     * @param  array<string, mixed>  $profile
     */
    private function formatProfile(array $profile): string
    {
        $value = fn (mixed $value): string => $value === null ? 'n/a' : (string) $value;
        $ms = fn (mixed $value): string => $value === null ? 'n/a' : $value.' ms';

        return implode(PHP_EOL, [
            '==============================',
            'REQUEST PROFILE',
            '==============================',
            '',
            'UUID:',
            $value($profile['uuid']),
            '',
            'TIMESTAMP:',
            $value($profile['timestamp']),
            '',
            'URL:',
            $value($profile['url']),
            '',
            'METHOD:',
            $value($profile['method']),
            '',
            'STATUS:',
            $value($profile['status']),
            '',
            'EXCEPTION:',
            $value($profile['exception']),
            '',
            'TOTAL:',
            $ms($profile['total_ms']),
            '',
            'TOTAL UNTIL TERMINATE:',
            $ms($profile['terminate_ms']),
            '',
            'AFTER RESPONSE:',
            $ms($profile['after_response_ms']),
            '',
            'LARAVEL BOOT:',
            $ms($profile['laravel_boot_ms']),
            '',
            'MIDDLEWARE UNTIL ROUTE MATCH:',
            $ms($profile['middleware_until_route_ms']),
            '',
            'ROUTE PIPELINE:',
            $ms($profile['route_pipeline_ms']),
            '',
            'DATABASE CONNECT:',
            $ms($profile['database_connect_ms']),
            '',
            'DATABASE CONNECTION:',
            $value($profile['database_connection']),
            '',
            'DATABASE QUERY TIME:',
            $ms($profile['database_query_time_ms']),
            '',
            'DATABASE QUERY COUNT:',
            $value($profile['database_query_count']),
            '',
            'CONTROLLER APPROX:',
            $ms($profile['controller_ms']),
            '',
            'RESOURCE / RESPONSE SERIALIZATION:',
            $ms($profile['resource_ms']),
            '',
            'MEMORY:',
            $profile['memory_mb'].' MB',
            '',
            '==============================',
        ]);
    }

    private function now(): float
    {
        return microtime(true);
    }

    private function ms(float $seconds): float
    {
        return round($seconds * 1000, 2);
    }
}
