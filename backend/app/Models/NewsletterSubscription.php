<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'email',
    'source',
    'language',
    'status',
    'subscribed_at',
    'unsubscribed_at',
    'ip_address',
    'user_agent',
])]
class NewsletterSubscription extends Model
{
    public const STATUS_ACTIVE = 'active';
    public const STATUS_UNSUBSCRIBED = 'unsubscribed';

    public const SOURCE_EVENTS = 'events';
    public const SOURCE_RESTAURANTS = 'restaurants';

    protected function casts(): array
    {
        return [
            'subscribed_at' => 'datetime',
            'unsubscribed_at' => 'datetime',
        ];
    }
}
