<?php

namespace App\Models;

use App\Services\Storage\PublicStorageUrl;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'venue_id',
    'disk',
    'path',
    'image_path',
    'sort_order',
])]
class VenueImage extends Model
{
    use HasFactory;

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class);
    }

    public function publicUrl(): string
    {
        return app(PublicStorageUrl::class)->imageUrl(
            null,
            $this->path ?: $this->image_path,
            $this->image_path,
        );
    }

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
        ];
    }
}
