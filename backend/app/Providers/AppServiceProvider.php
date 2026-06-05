<?php

namespace App\Providers;

use App\Models\Event;
use App\Models\Ticket;
use App\Policies\EventPolicy;
use App\Policies\TicketPolicy;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(Event::class, EventPolicy::class);
        Gate::policy(Ticket::class, TicketPolicy::class);

        ResetPassword::createUrlUsing(function (object $notifiable, string $token): string {
            $query = http_build_query([
                'token' => $token,
                'email' => $notifiable->getEmailForPasswordReset(),
            ]);

            return rtrim((string) config('services.frontend.url'), '/')."/site/reset-password.html?{$query}";
        });

        ResetPassword::toMailUsing(function (object $notifiable, string $token): MailMessage {
            $query = http_build_query([
                'token' => $token,
                'email' => $notifiable->getEmailForPasswordReset(),
            ]);
            $resetUrl = rtrim((string) config('services.frontend.url'), '/')."/site/reset-password.html?{$query}";

            return (new MailMessage)
                ->subject('Reset your Event Sphere password')
                ->view([
                    'html' => 'emails.auth.reset-password',
                    'text' => 'emails.auth.reset-password-text',
                ], [
                    'user' => $notifiable,
                    'resetUrl' => $resetUrl,
                    'expirationMinutes' => config('auth.passwords.'.config('auth.defaults.passwords').'.expire', 60),
                ]);
        });
    }
}
