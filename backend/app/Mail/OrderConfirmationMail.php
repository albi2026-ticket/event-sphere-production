<?php

namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OrderConfirmationMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param  array<string, mixed>  $emailData
     */
    public function __construct(
        public readonly Order $order,
        public readonly array $emailData,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Your Event Sphere tickets for order {$this->order->order_number}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.orders.confirmation',
            text: 'emails.orders.confirmation-text',
        );
    }
}
