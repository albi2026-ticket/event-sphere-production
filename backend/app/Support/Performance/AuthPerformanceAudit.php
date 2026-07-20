<?php

namespace App\Support\Performance;

use App\Http\Middleware\PerformanceProfiler;

class AuthPerformanceAudit
{
    private static int $depth = 0;

    /**
     * @var array<int, array{name: string, started_at: float, meta: array<string, mixed>}>
     */
    private static array $stack = [];

    /**
     * @param array<string, mixed> $meta
     */
    public static function measure(string $name, callable $callback, array $meta = []): mixed
    {
        self::startContext();
        $id = self::start($name, $meta);

        try {
            return $callback();
        } finally {
            self::end($id);
            self::endContext();
        }
    }

    /**
     * @param array<string, mixed> $meta
     */
    public static function start(string $name, array $meta = []): int
    {
        $id = count(self::$stack) + 1;
        self::$stack[$id] = [
            'name' => $name,
            'started_at' => microtime(true),
            'meta' => $meta,
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
            ($finishedAt - $step['started_at']) * 1000,
            $step['meta']
        );
    }

    /**
     * @param array<string, mixed> $meta
     */
    public static function record(string $name, float $startedAt, float $finishedAt, array $meta = []): void
    {
        PerformanceProfiler::addAuthAuditStep(
            $name,
            $startedAt,
            $finishedAt,
            ($finishedAt - $startedAt) * 1000,
            $meta
        );
    }

    public static function annotateLastSqlRows(string $name, int $rows): void
    {
        PerformanceProfiler::annotateLastAuthSqlRows($name, $rows);
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
