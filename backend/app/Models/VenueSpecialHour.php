<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'venue_id',
    'date',
    'opens_at',
    'closes_at',
    'is_closed',
])]
class VenueSpecialHour extends Model
{
    use HasFactory;

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class);
    }

    protected function casts(): array
    {
        return [
            'date' => 'date:Y-m-d',
            'is_closed' => 'boolean',
        ];
    }
}
