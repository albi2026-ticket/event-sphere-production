<?php

namespace App\Mail;

use App\Models\Event;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class EventCancelledAdminMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param  array<string, mixed>  $emailData
     */
    public function __construct(
        public readonly Event $event,
        public readonly array $emailData,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Event Cancelled - Admin Notification',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.events.cancelled-admin',
            text: 'emails.events.cancelled-admin-text',
        );
    }
}
