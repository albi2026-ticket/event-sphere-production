<?php

use App\Http\Middleware\AddSecurityHeaders;
use App\Http\Middleware\EnsureEmailIsVerified;
use App\Http\Middleware\EnsureOrganizerOwnsEvent;
use App\Http\Middleware\EnsureUserHasRole;
use App\Http\Middleware\PerformanceProfiler;
use App\Http\Middleware\ProfilingAuthenticate;
use App\Http\Middleware\ProfilingAuthorize;
use App\Http\Middleware\ProfilingThrottleRequests;
use App\Http\Middleware\SetApplicationLocale;
use App\Http\Middleware\ThrottleImageUploads;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $trustedProxyHeaders = Request::HEADER_X_FORWARDED_FOR |
            Request::HEADER_X_FORWARDED_HOST |
            Request::HEADER_X_FORWARDED_PORT |
            Request::HEADER_X_FORWARDED_PROTO |
            Request::HEADER_X_FORWARDED_PREFIX |
            Request::HEADER_X_FORWARDED_AWS_ELB;

        if (env('TRUSTED_PROXY_HEADERS') !== null && env('TRUSTED_PROXY_HEADERS') !== '') {
            $trustedProxyHeaders = (int) env('TRUSTED_PROXY_HEADERS');
        }

        $middleware->trustProxies(
            at: env('TRUSTED_PROXIES'),
            headers: $trustedProxyHeaders
        );

        $middleware->prepend(PerformanceProfiler::class);
        $middleware->append(AddSecurityHeaders::class);

        $middleware->api(
            prepend: [
                EnsureFrontendRequestsAreStateful::class,
                SetApplicationLocale::class,
            ],
            append: [
                ThrottleImageUploads::class,
            ],
        );

        $middleware->alias([
            'auth' => ProfilingAuthenticate::class,
            'can' => ProfilingAuthorize::class,
            'throttle' => ProfilingThrottleRequests::class,
            'verified' => EnsureEmailIsVerified::class,
            'role' => EnsureUserHasRole::class,
            'organizer.event' => EnsureOrganizerOwnsEvent::class,
        ]);

        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
