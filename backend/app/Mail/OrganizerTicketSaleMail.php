<?php

namespace App\Mail;

use App\Models\Event;
use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OrganizerTicketSaleMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param  array<string, mixed>  $emailData
     */
    public function __construct(
        public readonly Event $event,
        public readonly Order $order,
        public readonly array $emailData,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "New Ticket Sold • {$this->event->title}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.events.ticket-sold-organizer',
            text: 'emails.events.ticket-sold-organizer-text',
        );
    }
}
