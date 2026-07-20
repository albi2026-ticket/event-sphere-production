<?php

namespace App\Support\Performance;

use Illuminate\Support\Facades\Log;

class DeepControllerProfiler
{
    /**
     * @var array<string, array{controller: string, started_at: float, sections: array<int, array{name: string, ms: float}>}>
     */
    private static array $profiles = [];

    public static function begin(string $controller): string
    {
        if (! self::enabled()) {
            return '';
        }

        $uuid = (string) request()->attributes->get('performance_profile_uuid', spl_object_id(request()));

        if (! isset(self::$profiles[$uuid])) {
            self::$profiles[$uuid] = [
                'controller' => $controller,
                'started_at' => microtime(true),
                'sections' => [],
            ];

            request()->attributes->set('deep_controller_profile_uuid', $uuid);

            app()->terminating(function () use ($uuid): void {
                self::log($uuid);
            });
        }

        self::point('ENTER');

        return $uuid;
    }

    public static function point(string $name): void
    {
        self::record($name, 0.0);
    }

    public static function section(string $name, callable $callback): mixed
    {
        if (! self::enabled()) {
            return $callback();
        }

        $startedAt = microtime(true);

        try {
            return $callback();
        } finally {
            self::record($name, (microtime(true) - $startedAt) * 1000);
        }
    }

    public static function record(string $name, float $milliseconds): void
    {
        $uuid = request()->attributes->get('deep_controller_profile_uuid');

        if (! is_string($uuid) || ! isset(self::$profiles[$uuid])) {
            return;
        }

        self::$profiles[$uuid]['sections'][] = [
            'name' => $name,
            'ms' => round($milliseconds, 2),
        ];
    }

    private static function log(string $uuid): void
    {
        if (! isset(self::$profiles[$uuid])) {
            return;
        }

        $profile = self::$profiles[$uuid];
        $totalMs = round((microtime(true) - $profile['started_at']) * 1000, 2);
        $lines = [
            '========== '.$profile['controller'].' ==========',
            '',
        ];

        foreach ($profile['sections'] as $section) {
            $lines[] = $section['name'];
            $lines[] = number_format($section['ms'], 2, '.', '').'ms';
            $lines[] = '';
        }

        $lines[] = 'TOTAL';
        $lines[] = number_format($totalMs, 2, '.', '').'ms';
        $lines[] = '';
        $lines[] = str_repeat('=', 42);

        Log::info(implode(PHP_EOL, $lines));

        unset(self::$profiles[$uuid]);
    }

    private static function enabled(): bool
    {
        return app()->environment('production')
            || filter_var(env('APP_DEBUG_PROFILING', false), FILTER_VALIDATE_BOOLEAN);
    }
}
