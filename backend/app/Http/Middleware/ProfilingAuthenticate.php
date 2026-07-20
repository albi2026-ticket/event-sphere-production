<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Auth\Middleware\Authenticate;

class ProfilingAuthenticate extends Authenticate
{
    public function handle($request, Closure $next, ...$guards): mixed
    {
        PerformanceProfiler::time('authenticate_middleware', function () use ($request, $guards): void {
            $this->authenticate($request, $guards);
        });

        return $next($request);
    }
}
