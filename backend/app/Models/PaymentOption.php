<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable([
    'name',
    'slug',
])]
class PaymentOption extends Model
{
    use HasFactory;

    public function venues(): BelongsToMany
    {
        return $this->belongsToMany(Venue::class, 'venue_payment_option');
    }
}
