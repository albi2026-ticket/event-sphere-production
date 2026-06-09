<?php

namespace App\Providers;

use App\Events\EventCancelled as EventCancelledEvent;
use App\Listeners\SendEventCancellationNotifications;
use App\Models\Event;
use App\Models\Ticket;
use App\Policies\EventPolicy;
use App\Policies\TicketPolicy;
use App\Support\AppUrls;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\Event as EventFacade;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\URL;
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
        EventFacade::listen(EventCancelledEvent::class, SendEventCancellationNotifications::class);

        URL::forceRootUrl(AppUrls::backend());

        $resetPasswordUrl = function (object $notifiable, string $token): string {
            return AppUrls::frontend('/site/reset-password.html', [
                'token' => $token,
                'email' => $notifiable->getEmailForPasswordReset(),
            ]);
        };

        ResetPassword::createUrlUsing($resetPasswordUrl);

        ResetPassword::toMailUsing(function (object $notifiable, string $token) use ($resetPasswordUrl): MailMessage {
            return (new MailMessage)
                ->subject('Reset your Event Sphere password')
                ->view([
                    'html' => 'emails.auth.reset-password',
                    'text' => 'emails.auth.reset-password-text',
                ], [
                    'user' => $notifiable,
                    'resetUrl' => $resetPasswordUrl($notifiable, $token),
                    'expirationMinutes' => config('auth.passwords.'.config('auth.defaults.passwords').'.expire', 60),
                ]);
        });
    }
}
