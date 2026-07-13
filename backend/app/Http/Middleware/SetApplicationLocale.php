<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class SetApplicationLocale
{
    public function handle(Request $request, Closure $next): Response
    {
        $language = $request->user()?->preferred_language
            ?: $request->headers->get('X-Tiketa-Language')
            ?: $request->input('preferred_language');

        App::setLocale(in_array($language, ['en', 'sq'], true) ? $language : 'en');

        return $next($request);
    }
}
