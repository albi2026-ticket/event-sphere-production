<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AddSecurityHeaders
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('Content-Security-Policy', (string) config('security.headers.content_security_policy'));
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Referrer-Policy', (string) config('security.headers.referrer_policy'));
        $response->headers->set('Permissions-Policy', (string) config('security.headers.permissions_policy'));
        $response->headers->set('Cross-Origin-Opener-Policy', (string) config('security.headers.cross_origin_opener_policy'));
        $response->headers->set('Cross-Origin-Resource-Policy', (string) config('security.headers.cross_origin_resource_policy'));
        $response->headers->set('Origin-Agent-Cluster', (string) config('security.headers.origin_agent_cluster'));

        if ($request->isSecure() || app()->environment('production')) {
            $response->headers->set('Strict-Transport-Security', (string) config('security.headers.strict_transport_security'));
        }

        return $response;
    }
}
