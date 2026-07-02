<?php

namespace App\Notifications\Auth;

use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;

class EventSphereVerifyEmail extends VerifyEmail
{
    use Queueable;

    public function toMail($notifiable): MailMessage
    {
        app()->setLocale($notifiable->preferred_language ?? 'en');

        $verificationUrl = $this->verificationUrl($notifiable);

        return (new MailMessage)
            ->subject(__('emails.verify_email_title'))
            ->view(
                ['emails.auth.verify-email', 'emails.auth.verify-email-text'],
                [
                    'user' => $notifiable,
                    'verificationUrl' => $verificationUrl,
                    'expirationMinutes' => config('auth.verification.expire', 60),
                ],
            );
    }
}
