<?php

namespace App\Mail;

use App\Models\User;
use App\Support\AppUrls;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WelcomeMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public readonly User $user) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: __('emails.account_welcome_title'),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.account.welcome',
            with: [
                'user' => $this->user,
                'dashboardUrl' => AppUrls::frontend('/site/welcome.html'),
            ],
        );
    }
}
