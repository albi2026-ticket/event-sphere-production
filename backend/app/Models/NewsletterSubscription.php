<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'email',
    'source',
    'subscribed_at',
    'ip_address',
    'user_agent',
])]
class NewsletterSubscription extends Model
{
    protected function casts(): array
    {
        return [
            'subscribed_at' => 'datetime',
        ];
    }
}
