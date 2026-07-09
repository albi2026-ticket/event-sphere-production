<?php

return [
    'auth_login_per_minute' => (int) env('RATE_LIMIT_AUTH_LOGIN_PER_MINUTE', 5),
    'auth_register_per_minute' => (int) env('RATE_LIMIT_AUTH_REGISTER_PER_MINUTE', 3),
    'reservation_per_minute' => (int) env('RATE_LIMIT_RESERVATION_PER_MINUTE', 10),
    'checkout_per_minute' => (int) env('RATE_LIMIT_CHECKOUT_PER_MINUTE', 5),
    'scanner_per_minute' => (int) env('RATE_LIMIT_SCANNER_PER_MINUTE', 30),
    'api_search_per_minute' => (int) env('RATE_LIMIT_API_SEARCH_PER_MINUTE', 60),
    'upload_per_minute' => (int) env('RATE_LIMIT_UPLOAD_PER_MINUTE', 10),
];
