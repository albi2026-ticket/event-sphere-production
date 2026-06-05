<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

#[Fillable(['name', 'slug', 'icon', 'is_active', 'sort_order'])]
class EventCategory extends Model
{
    protected static function booted(): void
    {
        static::saving(function (self $category): void {
            if (! $category->slug) {
                $category->slug = Str::slug($category->name);
            }
        });
    }

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function events(): HasMany
    {
        return $this->hasMany(Event::class, 'category', 'name');
    }
}
