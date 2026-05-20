<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable([
    'name',
    'first_name',
    'last_name',
    'email',
    'password',
    'role',
    'phone',
    'avatar_url',
    'default_city',
    'email_notifications',
    'sms_reminders',
    'marketing_emails',
    'organizer_status',
    'organizer_approved_at',
    'organizer_approved_by',
    'status',
    'last_login_at',
])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    public const ROLE_USER = 'user';
    public const ROLE_ORGANIZER = 'organizer';
    public const ROLE_ADMIN = 'admin';

    public const ORGANIZER_STATUS_NONE = 'none';
    public const ORGANIZER_STATUS_PENDING = 'pending';
    public const ORGANIZER_STATUS_APPROVED = 'approved';
    public const ORGANIZER_STATUS_REJECTED = 'rejected';

    public const STATUS_ACTIVE = 'active';
    public const STATUS_SUSPENDED = 'suspended';
    public const STATUS_BANNED = 'banned';

    public function organizedEvents(): HasMany
    {
        return $this->hasMany(Event::class, 'organizer_id');
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }

    public function favorites(): HasMany
    {
        return $this->hasMany(Favorite::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function checkedInTickets(): HasMany
    {
        return $this->hasMany(Ticket::class, 'checked_in_by');
    }

    public function receivedTransferredTickets(): HasMany
    {
        return $this->hasMany(Ticket::class, 'transferred_to_user_id');
    }

    public function organizerApprovedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'organizer_approved_by');
    }

    public function approvedOrganizers(): HasMany
    {
        return $this->hasMany(User::class, 'organizer_approved_by');
    }

    public function isAdmin(): bool
    {
        return $this->role === self::ROLE_ADMIN;
    }

    public function isOrganizer(): bool
    {
        return $this->role === self::ROLE_ORGANIZER
            && $this->organizer_status === self::ORGANIZER_STATUS_APPROVED;
    }

    public function isUser(): bool
    {
        return $this->role === self::ROLE_USER;
    }

    public function canManageEvent(Event $event): bool
    {
        return $this->isAdmin()
            || ($this->isOrganizer() && $event->organizer_id === $this->id);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'email_notifications' => 'boolean',
            'sms_reminders' => 'boolean',
            'marketing_emails' => 'boolean',
            'organizer_approved_at' => 'datetime',
            'last_login_at' => 'datetime',
        ];
    }
}
