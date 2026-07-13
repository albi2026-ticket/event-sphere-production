<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => [
        'api/*',
        'sanctum/csrf-cookie',
    ],

    'allowed_methods' => array_values(array_unique(array_filter(array_map(
        'trim',
        explode(',', (string) env('CORS_ALLOWED_METHODS', 'GET,POST,PUT,PATCH,DELETE,OPTIONS'))
    )))),

    'allowed_origins' => array_values(array_unique(array_filter(array_map(
        'trim',
        explode(',', (string) env('CORS_ALLOWED_ORIGINS', env('FRONTEND_URL', 'http://localhost:8080')))
    )))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => array_values(array_unique(array_filter(array_map(
        'trim',
        explode(',', (string) env('CORS_ALLOWED_HEADERS', 'Accept,Authorization,Content-Type,X-Requested-With,X-CSRF-TOKEN,X-XSRF-TOKEN,X-Tiketa-Language'))
    )))),

    'exposed_headers' => array_values(array_unique(array_filter(array_map(
        'trim',
        explode(',', (string) env('CORS_EXPOSED_HEADERS', 'X-RateLimit-Limit,X-RateLimit-Remaining,Retry-After'))
    )))),

    'max_age' => (int) env('CORS_MAX_AGE', 600),

    'supports_credentials' => filter_var(env('CORS_SUPPORTS_CREDENTIALS', true), FILTER_VALIDATE_BOOL),

];
