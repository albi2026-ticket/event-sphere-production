<?php

namespace App\Mail;

use App\Models\EmailLog;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AdminRetriedEmail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public readonly EmailLog $originalLog) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->originalLog->subject,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.dynamic-html',
            text: 'emails.dynamic-text',
            with: [
                'html' => '<p>This email log stores metadata only. Rendered email bodies are not retained for security.</p>',
                'text' => 'This email log stores metadata only. Rendered email bodies are not retained for security.',
            ],
        );
    }
}
