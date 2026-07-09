<?php

$imageSources = [
    "'self'",
    'data:',
    'blob:',
    'https:',
];

$connectSources = [
    "'self'",
    'https:',
    'wss:',
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
    $connectSources[] = 'http:';
    $connectSources[] = 'ws:';
}

return [
    'headers' => [
        'content_security_policy' => implode('; ', [
            "default-src 'self'",
            "base-uri 'self'",
            "object-src 'none'",
            "frame-ancestors 'none'",
            "form-action 'self'",
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://maps.googleapis.com",
            "script-src-elem 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://maps.googleapis.com",
            "script-src-attr 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
            "style-src-elem 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
            "style-src-attr 'unsafe-inline'",
            'img-src '.implode(' ', array_unique($imageSources)),
            "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net",
            'connect-src '.implode(' ', array_unique($connectSources)),
            "media-src 'self' data: blob: https:",
            "frame-src 'self' https://maps.google.com https://www.google.com",
            "child-src 'self' https://maps.google.com https://www.google.com",
            "worker-src 'self' blob:",
            "manifest-src 'self'",
            "prefetch-src 'self' https:",
            "upgrade-insecure-requests",
            "block-all-mixed-content",
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
        'cross_origin_opener_policy' => 'same-origin-allow-popups',
        'cross_origin_resource_policy' => 'cross-origin',
        'origin_agent_cluster' => '?1',
    ],
];
