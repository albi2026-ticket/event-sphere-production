<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserProfileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'email' => $this->email,
            'email_verified' => $this->hasVerifiedEmail(),
            'email_status' => $this->hasVerifiedEmail() ? 'verified' : 'not_verified',
            'email_verified_at' => $this->email_verified_at,
            'role' => $this->role,
            'phone' => $this->phone,
            'avatar_url' => $this->avatar_url,
            'default_city' => $this->default_city,
            'status' => $this->status,
            'organizer_status' => $this->organizer_status,
            'organizer_approved_at' => $this->organizer_approved_at,
            'email_notifications' => $this->email_notifications,
            'sms_reminders' => $this->sms_reminders,
            'marketing_emails' => $this->marketing_emails,
            'last_login_at' => $this->last_login_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
