<?php

namespace App\Support\Performance;

use App\Http\Middleware\PerformanceProfiler;

class AuthPerformanceAudit
{
    private static int $depth = 0;

    /**
     * @var array<int, array{name: string, started_at: float}>
     */
    private static array $stack = [];

    public static function measure(string $name, callable $callback): mixed
    {
        self::startContext();
        $id = self::start($name);

        try {
            return $callback();
        } finally {
            self::end($id);
            self::endContext();
        }
    }

    public static function start(string $name): int
    {
        $id = count(self::$stack) + 1;
        self::$stack[$id] = [
            'name' => $name,
            'started_at' => microtime(true),
        ];

        return $id;
    }

    public static function end(int $id): void
    {
        if (! isset(self::$stack[$id])) {
            return;
        }

        $finishedAt = microtime(true);
        $step = self::$stack[$id];
        unset(self::$stack[$id]);

        PerformanceProfiler::addAuthAuditStep(
            $step['name'],
            $step['started_at'],
            $finishedAt,
            ($finishedAt - $step['started_at']) * 1000
        );
    }

    public static function startContext(): void
    {
        self::$depth++;
    }

    public static function endContext(): void
    {
        self::$depth = max(0, self::$depth - 1);
    }

    public static function active(): bool
    {
        return self::$depth > 0;
    }
}
