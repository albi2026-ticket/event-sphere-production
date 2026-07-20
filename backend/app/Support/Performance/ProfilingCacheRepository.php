<?php

namespace App\Support\Performance;

use App\Http\Middleware\PerformanceProfiler;
use Closure;
use Illuminate\Cache\Repository;

class ProfilingCacheRepository extends Repository
{
    public function get($key, $default = null): mixed
    {
        if (AuthPerformanceAudit::active()) {
            return AuthPerformanceAudit::measure('Cache::get during authentication', function () use ($key, $default): mixed {
                $startedAt = microtime(true);

                try {
                    return parent::get($key, $default);
                } finally {
                    PerformanceProfiler::addCacheTiming('get', (microtime(true) - $startedAt) * 1000);
                }
            });
        }

        $startedAt = microtime(true);

        try {
            return parent::get($key, $default);
        } finally {
            PerformanceProfiler::addCacheTiming('get', (microtime(true) - $startedAt) * 1000);
        }
    }

    public function remember($key, $ttl, Closure $callback): mixed
    {
        if (AuthPerformanceAudit::active()) {
            return AuthPerformanceAudit::measure('Cache::remember during authentication', function () use ($key, $ttl, $callback): mixed {
                $startedAt = microtime(true);

                try {
                    return parent::remember($key, $ttl, $callback);
                } finally {
                    PerformanceProfiler::addCacheTiming('remember', (microtime(true) - $startedAt) * 1000);
                }
            });
        }

        $startedAt = microtime(true);

        try {
            return parent::remember($key, $ttl, $callback);
        } finally {
            PerformanceProfiler::addCacheTiming('remember', (microtime(true) - $startedAt) * 1000);
        }
    }

    public function put($key, $value, $ttl = null): bool
    {
        if (AuthPerformanceAudit::active()) {
            return AuthPerformanceAudit::measure('Cache::put during authentication', function () use ($key, $value, $ttl): bool {
                $startedAt = microtime(true);

                try {
                    return parent::put($key, $value, $ttl);
                } finally {
                    PerformanceProfiler::addCacheTiming('put', (microtime(true) - $startedAt) * 1000);
                }
            });
        }

        $startedAt = microtime(true);

        try {
            return parent::put($key, $value, $ttl);
        } finally {
            PerformanceProfiler::addCacheTiming('put', (microtime(true) - $startedAt) * 1000);
        }
    }
}
