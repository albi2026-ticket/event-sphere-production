<?php

namespace App\Mail;

use App\Models\NewsletterSubscription;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\URL;

class SubscriberWelcomeMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public readonly NewsletterSubscription $subscription) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Welcome to Tiketa updates',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.subscribers.welcome',
            text: 'emails.subscribers.welcome-text',
            with: [
                'subscription' => $this->subscription,
                'unsubscribeUrl' => URL::signedRoute('newsletter-subscriptions.unsubscribe', [
                    'newsletterSubscription' => $this->subscription,
                ]),
            ],
        );
    }
}
