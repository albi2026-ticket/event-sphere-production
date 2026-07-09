<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Cache\RateLimiter;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ThrottleImageUploads
{
    public function __construct(private readonly RateLimiter $limiter)
    {
    }

    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! $this->isImageUploadRequest($request)) {
            return $next($request);
        }

        $maxAttempts = max(1, (int) config('rate_limits.upload_per_minute'));
        $key = $this->rateLimitKey($request);

        if ($this->limiter->tooManyAttempts($key, $maxAttempts)) {
            $retryAfter = $this->limiter->availableIn($key);

            return response()->json([
                'message' => __('Too many upload attempts. Please try again later.'),
            ], 429)->withHeaders([
                'Retry-After' => $retryAfter,
                'X-RateLimit-Limit' => $maxAttempts,
                'X-RateLimit-Remaining' => 0,
            ]);
        }

        $this->limiter->hit($key, 60);

        $response = $next($request);
        $remaining = max(0, $maxAttempts - $this->limiter->attempts($key));

        $response->headers->set('X-RateLimit-Limit', (string) $maxAttempts);
        $response->headers->set('X-RateLimit-Remaining', (string) $remaining);

        return $response;
    }

    private function isImageUploadRequest(Request $request): bool
    {
        return $request->isMethod('POST')
            && (
                $request->is('api/organizer/events/*/images')
                || $request->is('api/admin/events/*/images')
                || $request->is('api/owner/venues/*/images')
            );
    }

    private function rateLimitKey(Request $request): string
    {
        $actor = $request->user() ? 'user:'.$request->user()->id : 'ip:'.$request->ip();

        return 'uploads|'.$actor;
    }
}
