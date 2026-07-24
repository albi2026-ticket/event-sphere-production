<?php

namespace App\Models;

use App\Services\Storage\PublicStorageUrl;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
    'is_banner',
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
        return app(PublicStorageUrl::class)->imageUrl(
            $this->disk,
            $this->path,
            $this->url,
            trim((string) config('services.supabase.event_images_bucket', 'event-images'), '/'),
        );
    }

    public function isExternal(): bool
    {
        return ! $this->disk && (bool) $this->url;
    }

    protected function casts(): array
    {
        return [
            'size' => 'integer',
            'width' => 'integer',
            'height' => 'integer',
            'sort_order' => 'integer',
            'is_primary' => 'boolean',
            'is_banner' => 'boolean',
        ];
    }
}
