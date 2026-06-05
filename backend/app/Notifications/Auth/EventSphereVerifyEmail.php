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
        $verificationUrl = $this->verificationUrl($notifiable);

        return (new MailMessage)
            ->subject('Verify your Event Sphere email address')
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
