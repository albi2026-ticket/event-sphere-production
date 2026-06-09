<?php

namespace App\Mail;

use App\Models\Event;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class EventCancelledOrganizerMail extends Mailable
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
            subject: 'Event Successfully Cancelled',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.events.cancelled-organizer',
            text: 'emails.events.cancelled-organizer-text',
        );
    }
}
