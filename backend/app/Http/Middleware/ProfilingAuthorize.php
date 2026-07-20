<?php

namespace App\Http\Middleware;

use App\Support\Performance\AuthPerformanceAudit;
use Closure;
use Illuminate\Auth\Middleware\Authorize;

class ProfilingAuthorize extends Authorize
{
    public function handle($request, Closure $next, $ability, ...$models): mixed
    {
        return AuthPerformanceAudit::measure(
            "Authorization middleware [{$ability}]",
            fn () => parent::handle($request, $next, $ability, ...$models)
        );
    }
}
