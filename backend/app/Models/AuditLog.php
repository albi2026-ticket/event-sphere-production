<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'action', 'auditable_type', 'auditable_id', 'metadata', 'ip_address'])]
class AuditLog extends Model
{
    public static function record(?User $user, string $action, mixed $auditable = null, array $metadata = [], ?string $ipAddress = null): self
    {
        return static::query()->create([
            'user_id' => $user?->id,
            'action' => $action,
            'auditable_type' => is_object($auditable) ? $auditable::class : null,
            'auditable_id' => is_object($auditable) && isset($auditable->id) ? $auditable->id : null,
            'metadata' => $metadata,
            'ip_address' => $ipAddress,
        ]);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    protected function casts(): array
    {
        return [
            'metadata' => 'json',
        ];
    }
}
