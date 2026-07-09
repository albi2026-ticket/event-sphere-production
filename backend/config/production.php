<?php

return [
    'required_env' => [
        'APP_ENV' => env('APP_ENV'),
        'APP_DEBUG' => env('APP_DEBUG'),
        'APP_KEY' => env('APP_KEY'),
        'APP_URL' => env('APP_URL'),
        'SESSION_DOMAIN' => env('SESSION_DOMAIN'),
        'SANCTUM_STATEFUL_DOMAINS' => env('SANCTUM_STATEFUL_DOMAINS'),
        'CACHE_DRIVER' => env('CACHE_DRIVER'),
        'QUEUE_CONNECTION' => env('QUEUE_CONNECTION'),
        'QUEUE_FAILED_DRIVER' => env('QUEUE_FAILED_DRIVER'),
        'FILESYSTEM_DISK' => env('FILESYSTEM_DISK'),
        'EVENT_IMAGES_DISK' => env('EVENT_IMAGES_DISK'),
        'LOG_CHANNEL' => env('LOG_CHANNEL'),
        'LOG_STACK' => env('LOG_STACK'),
        'LOG_DAILY_DAYS' => env('LOG_DAILY_DAYS'),
        'MAIL_MAILER' => env('MAIL_MAILER'),
        'MAIL_HOST' => env('MAIL_HOST'),
        'MAIL_PORT' => env('MAIL_PORT'),
        'MAIL_USERNAME' => env('MAIL_USERNAME'),
        'MAIL_PASSWORD' => env('MAIL_PASSWORD'),
        'MAIL_FROM_ADDRESS' => env('MAIL_FROM_ADDRESS'),
        'MAIL_FROM_NAME' => env('MAIL_FROM_NAME'),
        'LOG_LEVEL' => env('LOG_LEVEL'),
    ],
];
