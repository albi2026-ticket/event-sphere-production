<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

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
        if ($this->disk && $this->path) {
            return Storage::disk($this->disk)->url($this->path);
        }

        if (str_starts_with($this->image_path, 'http://') || str_starts_with($this->image_path, 'https://') || str_starts_with($this->image_path, 'data:')) {
            return $this->image_path;
        }

        return Storage::disk('public')->url($this->image_path);
    }

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
        ];
    }
}
