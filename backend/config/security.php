<?php

$imageSources = [
    "'self'",
    'data:',
    'blob:',
    'https:',
];

$configuredImageUrls = array_filter([
    env('APP_URL'),
    env('ASSET_URL'),
]);

foreach ($configuredImageUrls as $url) {
    $parts = parse_url((string) $url);
    if (! isset($parts['scheme'], $parts['host'])) {
        continue;
    }

    $origin = $parts['scheme'].'://'.$parts['host'].(isset($parts['port']) ? ':'.$parts['port'] : '');
    if (! in_array($origin, $imageSources, true)) {
        $imageSources[] = $origin;
    }
}

if (in_array(env('APP_ENV', 'production'), ['local', 'development', 'testing'], true)) {
    $imageSources[] = 'http://127.0.0.1:8000';
    $imageSources[] = 'http://localhost:8000';
}

return [
    'headers' => [
        'content_security_policy' => implode('; ', [
            "default-src 'self'",
            "base-uri 'self'",
            "object-src 'none'",
            "frame-ancestors 'none'",
            "form-action 'self'",
            "script-src 'self' https://cdn.jsdelivr.net https://maps.googleapis.com",
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
            'img-src '.implode(' ', array_unique($imageSources)),
            "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net",
            "connect-src 'self' http: https: ws: wss:",
            "frame-src 'self' https://maps.google.com https://www.google.com",
            "worker-src 'self' blob:",
            "manifest-src 'self'",
            "upgrade-insecure-requests",
        ]),
        'permissions_policy' => implode(', ', [
            'accelerometer=()',
            'autoplay=()',
            'camera=(self)',
            'display-capture=()',
            'encrypted-media=()',
            'fullscreen=(self)',
            'geolocation=(self)',
            'gyroscope=()',
            'magnetometer=()',
            'microphone=()',
            'midi=()',
            'payment=(self)',
            'picture-in-picture=()',
            'usb=()',
        ]),
        'strict_transport_security' => 'max-age=31536000; includeSubDomains; preload',
        'referrer_policy' => 'strict-origin-when-cross-origin',
    ],
];
