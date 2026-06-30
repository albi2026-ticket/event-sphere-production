<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

class HomepageCache
{
    public const TTL_SECONDS = 45;

    private const VERSION_KEY = 'homepage.cache.version';

    public static function ttl(): int
    {
        return self::TTL_SECONDS;
    }

    public static function endpointKey(array $limits): string
    {
        ksort($limits);

        return 'homepage.endpoint.'.self::version().'.'.md5(json_encode($limits));
    }

    public static function sectionKey(string $section, int|string $variant = 'default'): string
    {
        return "homepage.{$section}.".self::version().".{$variant}";
    }

    public static function invalidate(): void
    {
        Cache::forever(self::VERSION_KEY, str_replace(' ', '.', microtime()));
    }

    private static function version(): string
    {
        return Cache::rememberForever(self::VERSION_KEY, fn (): string => str_replace(' ', '.', microtime()));
    }
}
