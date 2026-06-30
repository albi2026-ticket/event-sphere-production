<?php

namespace App\Observers;

use Illuminate\Database\Eloquent\Model;
use App\Support\HomepageCache;

class HomepageCacheObserver
{
    public function saved(Model $model): void
    {
        HomepageCache::invalidate();
    }

    public function deleted(Model $model): void
    {
        HomepageCache::invalidate();
    }

    public function restored(Model $model): void
    {
        HomepageCache::invalidate();
    }

    public function forceDeleted(Model $model): void
    {
        HomepageCache::invalidate();
    }
}
