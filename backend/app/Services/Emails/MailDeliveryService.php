<?php

namespace App\Services\Emails;

use App\Mail\WelcomeMail;
use App\Models\User;
use Illuminate\Mail\Mailable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class MailDeliveryService
{
    /**
     * @param  array<string, mixed>  $context
     */
    public function send(string $email, ?string $name, Mailable $mailable, ?string $locale = null, array $context = [], bool $throw = false): bool
    {
        return $this->deliver('send', $email, $name, $mailable, $locale, $context, $throw);
    }

    /**
     * @param  array<string, mixed>  $context
     */
    public function queue(string $email, ?string $name, Mailable $mailable, ?string $locale = null, array $context = [], bool $throw = false): bool
    {
        return $this->deliver('queue', $email, $name, $mailable, $locale, $context, $throw);
    }

    public function sendWelcome(User $user, bool $throw = false): bool
    {
        if (! $user->email) {
            return false;
        }

        return $this->send(
            $user->email,
            $user->name,
            new WelcomeMail($user),
            $user->preferred_language ?: 'en',
            ['user_id' => $user->id, 'email_type' => 'Welcome Email'],
            $throw,
        );
    }

    public function sendVerification(User $user, bool $throw = false): bool
    {
        if ($user->hasVerifiedEmail()) {
            return true;
        }

        try {
            Log::info('Preparing verification email.', $this->context([
                'user_id' => $user->id,
                'recipient_email' => $user->email,
                'email_type' => 'Verify Email',
            ]));

            $user->sendEmailVerificationNotification();

            Log::info('Verification email dispatched.', $this->context([
                'user_id' => $user->id,
                'recipient_email' => $user->email,
                'email_type' => 'Verify Email',
            ]));

            return true;
        } catch (Throwable $exception) {
            $this->logFailure('Verification email failed.', $exception, [
                'user_id' => $user->id,
                'recipient_email' => $user->email,
                'email_type' => 'Verify Email',
            ]);

            if ($throw) {
                throw $exception;
            }

            return false;
        }
    }

    /**
     * @param  array<string, mixed>  $context
     */
    private function deliver(string $method, string $email, ?string $name, Mailable $mailable, ?string $locale, array $context, bool $throw): bool
    {
        $context = $this->context(array_merge($context, [
            'recipient_email' => $email,
            'mailable_class' => $mailable::class,
            'delivery_method' => $method,
        ]));

        try {
            Log::info('Preparing application email.', $context);

            $pending = Mail::to($email, $name);

            if ($locale) {
                $pending->locale($locale);
            }

            $pending->{$method}($mailable);

            Log::info($method === 'queue' ? 'Application email queued.' : 'Application email sent.', $context);

            return true;
        } catch (Throwable $exception) {
            $this->logFailure('Application email failed.', $exception, $context);

            if ($throw) {
                throw $exception;
            }

            return false;
        }
    }

    /**
     * @param  array<string, mixed>  $context
     * @return array<string, mixed>
     */
    private function context(array $context): array
    {
        $mailer = (string) config('mail.default');

        return array_merge([
            'mailer' => $mailer,
            'transport' => config("mail.mailers.{$mailer}.transport"),
            'from_address' => config('mail.from.address'),
            'from_name' => config('mail.from.name'),
            'queue_connection' => config('queue.default'),
        ], $context);
    }

    /**
     * @param  array<string, mixed>  $context
     */
    private function logFailure(string $message, Throwable $exception, array $context): void
    {
        Log::error($message, array_merge($context, [
            'exception' => $exception::class,
            'message' => $exception->getMessage(),
        ]));
    }
}
