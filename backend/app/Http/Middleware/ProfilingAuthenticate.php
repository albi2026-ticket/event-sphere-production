<?php

namespace App\Http\Middleware;

use App\Support\Performance\AuthPerformanceAudit;
use Closure;
use Illuminate\Auth\Middleware\Authenticate;

class ProfilingAuthenticate extends Authenticate
{
    public function handle($request, Closure $next, ...$guards): mixed
    {
        $guardLabel = $guards === [] ? 'default' : implode(',', $guards);

        AuthPerformanceAudit::measure("auth:{$guardLabel} middleware", function () use ($request, $guards): void {
            AuthPerformanceAudit::measure('Authenticate middleware', function () use ($request, $guards): void {
                PerformanceProfiler::time('authenticate_middleware', function () use ($request, $guards): void {
                    $this->authenticate($request, $guards);
                });
            });
        });

        return $next($request);
    }
}
