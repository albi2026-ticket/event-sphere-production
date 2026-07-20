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
            'response_send_ms' => null,
            'kernel_terminate_ms' => null,
            'status' => null,
            'exception' => null,
            'timings' => [],
            'cache' => [
                'get_count' => 0,
                'get_ms' => 0.0,
                'remember_count' => 0,
                'remember_ms' => 0.0,
                'put_count' => 0,
                'put_ms' => 0.0,
            ],
        ];

        app()->terminating(function () use ($uuid, $request): void {
            $this->logProfile($uuid, $request);
        });

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

        $startedAt = $this->now();
        self::$profiles[$uuid]['performance_profiler_terminate_started_at'] = $startedAt;
        self::$profiles[$uuid]['performance_profiler_terminate_ms'] = $this->ms($this->now() - $startedAt);
    }

    public static function time(string $name, callable $callback): mixed
    {
        if (self::$profiles === []) {
            return $callback();
        }

        $startedAt = microtime(true);

        try {
            return $callback();
        } finally {
            self::addTiming($name, (microtime(true) - $startedAt) * 1000);
        }
    }

    public static function addTiming(string $name, float $milliseconds): void
    {
        $uuid = self::activeUuid();

        if ($uuid === null) {
            return;
        }

        self::$profiles[$uuid]['timings'][$name] ??= [
            'count' => 0,
            'ms' => 0.0,
        ];

        self::$profiles[$uuid]['timings'][$name]['count']++;
        self::$profiles[$uuid]['timings'][$name]['ms'] += $milliseconds;
    }

    public static function addCacheTiming(string $operation, float $milliseconds): void
    {
        $uuid = self::activeUuid();

        if ($uuid === null || ! in_array($operation, ['get', 'remember', 'put'], true)) {
            return;
        }

        self::$profiles[$uuid]['cache'][$operation.'_count']++;
        self::$profiles[$uuid]['cache'][$operation.'_ms'] += $milliseconds;
    }

    public static function markResponseSent(Request $request, float $milliseconds): void
    {
        $uuid = $request->attributes->get('performance_profile_uuid');

        if (is_string($uuid) && isset(self::$profiles[$uuid])) {
            self::$profiles[$uuid]['response_send_ms'] = round($milliseconds, 2);
        }
    }

    public static function markKernelTerminated(Request $request, float $milliseconds): void
    {
        $uuid = $request->attributes->get('performance_profile_uuid');

        if (is_string($uuid) && isset(self::$profiles[$uuid])) {
            self::$profiles[$uuid]['kernel_terminate_ms'] = round($milliseconds, 2);
        }
    }

    public static function markKernelTerminateStarted(Request $request): void
    {
        $uuid = $request->attributes->get('performance_profile_uuid');

        if (is_string($uuid) && isset(self::$profiles[$uuid])) {
            self::$profiles[$uuid]['kernel_terminate_started_at'] = microtime(true);
        }
    }

    private function logProfile(string $uuid, Request $request): void
    {
        if (! isset(self::$profiles[$uuid])) {
            return;
        }

        $profile = self::$profiles[$uuid];
        $finishedAt = $this->now();
        if (($profile['kernel_terminate_ms'] ?? null) === null && isset($profile['kernel_terminate_started_at'])) {
            $profile['kernel_terminate_ms'] = $this->ms($finishedAt - (float) $profile['kernel_terminate_started_at']);
        }
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
        $timings = $this->formattedTimings($profile['timings']);
        $cache = $this->formattedCacheTimings($profile['cache']);
        $responseJsonMs = $timings['response_json']['ms'] ?? 0.0;
        $resourceTransformationMs = $resourceMs !== null
            ? round(max(0.0, $resourceMs - $responseJsonMs), 2)
            : null;
        $knownRoutePipelineMs = array_sum(array_map(
            fn (array $timing): float => (float) $timing['ms'],
            array_intersect_key($timings, array_flip([
                'authenticate_middleware',
                'throttle_middleware',
                'controller_invocation',
            ]))
        )) + (float) ($resourceMs ?? 0.0);
        $routeMiddlewareMs = $routePipelineMs !== null
            ? round(max(0.0, $routePipelineMs - $knownRoutePipelineMs), 2)
            : null;
        $response = $request->attributes->get('performance_profile_response');

        Log::info($this->formatProfile([
            'uuid' => $profile['uuid'],
            'timestamp' => $profile['timestamp'],
            'method' => $profile['method'],
            'url' => $profile['url'],
            'status' => $profile['status'] ?? ($response instanceof Response ? $response->getStatusCode() : null),
            'exception' => $profile['exception'],
            'total_ms' => $this->ms($responseReadyAt - (float) $profile['started_at']),
            'terminate_ms' => $this->ms($finishedAt - (float) $profile['started_at']),
            'after_response_ms' => $this->ms($finishedAt - $responseReadyAt),
            'laravel_boot_ms' => $profile['laravel_boot_ms'],
            'global_middleware_ms' => $routeMatchedAt
                ? $this->ms($routeMatchedAt - (float) $profile['handle_started_at'])
                : null,
            'route_pipeline_ms' => $routePipelineMs,
            'authenticate_middleware_ms' => $timings['authenticate_middleware']['ms'] ?? null,
            'authenticate_middleware_count' => $timings['authenticate_middleware']['count'] ?? 0,
            'throttle_middleware_ms' => $timings['throttle_middleware']['ms'] ?? null,
            'throttle_middleware_count' => $timings['throttle_middleware']['count'] ?? 0,
            'route_middleware_ms' => $routeMiddlewareMs,
            'controller_invocation_ms' => $timings['controller_invocation']['ms'] ?? null,
            'controller_invocation_count' => $timings['controller_invocation']['count'] ?? 0,
            'resource_transformation_ms' => $resourceTransformationMs,
            'response_json_ms' => $timings['response_json']['ms'] ?? null,
            'response_json_count' => $timings['response_json']['count'] ?? 0,
            'json_encoding_ms' => $timings['json_encoding']['ms'] ?? null,
            'json_encoding_count' => $timings['json_encoding']['count'] ?? 0,
            'response_send_ms' => $profile['response_send_ms'],
            'terminable_middleware_ms' => $profile['kernel_terminate_ms'],
            'cache_get_ms' => $cache['get_ms'],
            'cache_get_count' => $cache['get_count'],
            'cache_remember_ms' => $cache['remember_ms'],
            'cache_remember_count' => $cache['remember_count'],
            'cache_put_ms' => $cache['put_ms'],
            'cache_put_count' => $cache['put_count'],
            'database_connect_ms' => $dbConnectedAt
                ? $this->ms($dbConnectedAt - (float) $profile['handle_started_at'])
                : null,
            'database_connection' => $profile['db_connection_name'],
            'database_query_time_ms' => $this->ms((float) $profile['db_query_time_ms']),
            'database_query_count' => (int) $profile['db_query_count'],
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

    private static function activeUuid(): ?string
    {
        if (self::$profiles === []) {
            return null;
        }

        $uuid = array_key_last(self::$profiles);

        return is_string($uuid) && isset(self::$profiles[$uuid]) ? $uuid : null;
    }

    /**
     * @param  array<string, array{count: int, ms: float}>  $timings
     * @return array<string, array{count: int, ms: float}>
     */
    private function formattedTimings(array $timings): array
    {
        return array_map(fn (array $timing): array => [
            'count' => (int) $timing['count'],
            'ms' => $this->ms((float) $timing['ms'] / 1000),
        ], $timings);
    }

    /**
     * @param  array<string, float|int>  $cache
     * @return array<string, float|int>
     */
    private function formattedCacheTimings(array $cache): array
    {
        foreach (['get', 'remember', 'put'] as $operation) {
            $cache[$operation.'_ms'] = $this->ms((float) $cache[$operation.'_ms'] / 1000);
            $cache[$operation.'_count'] = (int) $cache[$operation.'_count'];
        }

        return $cache;
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
            'GLOBAL MIDDLEWARE:',
            $ms($profile['global_middleware_ms']),
            '',
            'ROUTE PIPELINE:',
            $ms($profile['route_pipeline_ms']),
            '',
            'AUTHENTICATE MIDDLEWARE:',
            $ms($profile['authenticate_middleware_ms']).' ('.$profile['authenticate_middleware_count'].' calls)',
            '',
            'THROTTLE MIDDLEWARE:',
            $ms($profile['throttle_middleware_ms']).' ('.$profile['throttle_middleware_count'].' calls)',
            '',
            'ROUTE MIDDLEWARE / UNATTRIBUTED PIPELINE:',
            $ms($profile['route_middleware_ms']),
            '',
            'CONTROLLER INVOCATION:',
            $ms($profile['controller_invocation_ms']).' ('.$profile['controller_invocation_count'].' calls)',
            '',
            'RESOURCE TRANSFORMATION:',
            $ms($profile['resource_transformation_ms']),
            '',
            'response()->json():',
            $ms($profile['response_json_ms']).' ('.$profile['response_json_count'].' calls)',
            '',
            'JSON ENCODING:',
            $ms($profile['json_encoding_ms']).' ('.$profile['json_encoding_count'].' calls)',
            '',
            'RESPONSE SENDING:',
            $ms($profile['response_send_ms']),
            '',
            'TERMINABLE MIDDLEWARE:',
            $ms($profile['terminable_middleware_ms']),
            '',
            'CACHE get():',
            $ms($profile['cache_get_ms']).' ('.$profile['cache_get_count'].' calls)',
            '',
            'CACHE remember():',
            $ms($profile['cache_remember_ms']).' ('.$profile['cache_remember_count'].' calls)',
            '',
            'CACHE put():',
            $ms($profile['cache_put_ms']).' ('.$profile['cache_put_count'].' calls)',
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
            'RESPONSE PREPARATION TOTAL:',
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
