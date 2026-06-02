<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

#[Fillable([
    'event_id',
    'disk',
    'path',
    'url',
    'original_name',
    'mime_type',
    'size',
    'width',
    'height',
    'alt_text',
    'type',
    'sort_order',
    'is_primary',
])]
class EventImage extends Model
{
    use HasFactory;

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function publicUrl(): ?string
    {
        if ($this->disk && $this->path) {
            return Storage::disk($this->disk)->url($this->path);
        }

        return $this->url;
    }

    protected function casts(): array
    {
        return [
            'size' => 'integer',
            'width' => 'integer',
            'height' => 'integer',
            'sort_order' => 'integer',
            'is_primary' => 'boolean',
        ];
    }
}
