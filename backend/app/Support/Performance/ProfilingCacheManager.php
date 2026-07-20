<?php

namespace App\Support\Performance;

use Illuminate\Cache\CacheManager;
use Illuminate\Contracts\Cache\Store;
use Illuminate\Support\Arr;

class ProfilingCacheManager extends CacheManager
{
    public function repository(Store $store, array $config = [])
    {
        return tap(new ProfilingCacheRepository($store, Arr::only($config, ['store'])), function (ProfilingCacheRepository $repository) use ($config): void {
            if ($config['events'] ?? true) {
                $this->setEventDispatcher($repository);
            }
        });
    }
}
