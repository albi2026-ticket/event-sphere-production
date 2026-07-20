<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Routing\Middleware\ThrottleRequests;

class ProfilingThrottleRequests extends ThrottleRequests
{
    public function handle($request, Closure $next, $maxAttempts = 60, $decayMinutes = 1, $prefix = ''): mixed
    {
        $argumentCount = func_num_args();
        $downstreamMs = 0.0;
        $timedNext = function ($request) use ($next, &$downstreamMs): mixed {
            $startedAt = microtime(true);

            try {
                return $next($request);
            } finally {
                $downstreamMs += (microtime(true) - $startedAt) * 1000;
            }
        };
        $startedAt = microtime(true);

        try {
            return match ($argumentCount) {
                3 => parent::handle($request, $timedNext, $maxAttempts),
                4 => parent::handle($request, $timedNext, $maxAttempts, $decayMinutes),
                default => parent::handle($request, $timedNext, $maxAttempts, $decayMinutes, $prefix),
            };
        } finally {
            $totalMs = (microtime(true) - $startedAt) * 1000;

            PerformanceProfiler::addTiming('throttle_middleware', max(0.0, $totalMs - $downstreamMs));
        }
    }
}
