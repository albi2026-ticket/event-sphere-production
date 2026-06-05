<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['key', 'value'])]
class PlatformSetting extends Model
{
    public static function getValue(string $key, mixed $default = null): mixed
    {
        return static::query()->where('key', $key)->value('value') ?? $default;
    }

    public static function setValue(string $key, mixed $value): self
    {
        return static::query()->updateOrCreate(['key' => $key], ['value' => $value]);
    }

    protected function casts(): array
    {
        return [
            'value' => 'json',
        ];
    }
}
