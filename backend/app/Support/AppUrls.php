<?php

namespace App\Support;

class AppUrls
{
    public static function frontend(string $path = '', array $query = []): string
    {
        return self::join((string) config('services.frontend.url'), $path, $query);
    }

    public static function backend(string $path = '', array $query = []): string
    {
        return self::join((string) config('app.url'), $path, $query);
    }

    public static function api(string $path = '', array $query = []): string
    {
        return self::backend('/api/'.ltrim($path, '/'), $query);
    }

    protected static function join(string $baseUrl, string $path = '', array $query = []): string
    {
        $url = rtrim($baseUrl, '/');
        $path = trim($path);

        if ($path !== '') {
            $url .= '/'.ltrim($path, '/');
        }

        if ($query !== []) {
            $url .= '?'.http_build_query($query);
        }

        return $url;
    }
}
