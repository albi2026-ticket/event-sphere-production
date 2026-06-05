<?php

namespace App\Mail;

use App\Models\Order;
use App\Models\EmailTemplate;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Blade;

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
        $subject = "Your Event Sphere tickets for order {$this->order->order_number}";
        $template = $this->template();

        if ($template?->subject) {
            $subject = Blade::render($template->subject, [
                'order' => $this->order,
                'emailData' => $this->emailData,
            ]);
        }

        return new Envelope(
            subject: $subject,
        );
    }

    public function content(): Content
    {
        $template = $this->template();

        if ($template?->is_active && $template->html_template) {
            $data = [
                'order' => $this->order,
                'emailData' => $this->emailData,
            ];

            return new Content(
                view: 'emails.dynamic-html',
                text: 'emails.dynamic-text',
                with: [
                    'html' => Blade::render($template->html_template, $data),
                    'text' => Blade::render($template->text_template ?: strip_tags($template->html_template), $data),
                ],
            );
        }

        return new Content(
            view: 'emails.orders.confirmation',
            text: 'emails.orders.confirmation-text',
        );
    }

    protected function template(): ?EmailTemplate
    {
        return EmailTemplate::query()
            ->where('key', 'order_confirmation')
            ->where('is_active', true)
            ->first();
    }
}
