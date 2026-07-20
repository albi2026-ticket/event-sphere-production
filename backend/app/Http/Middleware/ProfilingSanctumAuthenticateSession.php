<?php

namespace App\Http\Middleware;

use App\Support\Performance\AuthPerformanceAudit;
use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\Http\Middleware\AuthenticateSession;
use Symfony\Component\HttpFoundation\Response;

class ProfilingSanctumAuthenticateSession extends AuthenticateSession
{
    public function handle(Request $request, Closure $next): Response
    {
        return AuthPerformanceAudit::measure(
            'Session lookup',
            fn (): Response => parent::handle($request, $next)
        );
    }
}
