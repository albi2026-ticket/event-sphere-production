<?php

namespace App\Providers;

use App\Events\EventCancelled as EventCancelledEvent;
use App\Listeners\LogOutgoingEmail;
use App\Listeners\SendEventCancellationNotifications;
use App\Models\Event;
use App\Models\EventCategory;
use App\Models\Ticket;
use App\Models\Venue;
use App\Observers\HomepageCacheObserver;
use App\Policies\EventPolicy;
use App\Policies\TicketPolicy;
use App\Support\AppUrls;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Mail\Events\MessageSending;
use Illuminate\Mail\Events\MessageSent;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\Event as EventFacade;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->assertProductionEnvironmentIsSafe();
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(Event::class, EventPolicy::class);
        Gate::policy(Ticket::class, TicketPolicy::class);
        EventFacade::listen(EventCancelledEvent::class, SendEventCancellationNotifications::class);
        EventFacade::listen(MessageSending::class, [LogOutgoingEmail::class, 'handleSending']);
        EventFacade::listen(MessageSent::class, [LogOutgoingEmail::class, 'handleSent']);
        Event::observe(HomepageCacheObserver::class);
        EventCategory::observe(HomepageCacheObserver::class);
        Venue::observe(HomepageCacheObserver::class);

        $this->configureRateLimiting();

        URL::forceRootUrl(AppUrls::backend());

        $resetPasswordUrl = function (object $notifiable, string $token): string {
            return AppUrls::frontend('/site/reset-password.html', [
                'token' => $token,
                'email' => $notifiable->getEmailForPasswordReset(),
            ]);
        };

        ResetPassword::createUrlUsing($resetPasswordUrl);

        ResetPassword::toMailUsing(function (object $notifiable, string $token) use ($resetPasswordUrl): MailMessage {
            app()->setLocale($notifiable->preferred_language ?? 'en');

            return (new MailMessage)
                ->subject(__('emails.reset_password_title'))
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

    private function assertProductionEnvironmentIsSafe(): void
    {
        if (! $this->app->environment('production')) {
            return;
        }

        if ((bool) config('app.debug')) {
            throw new \RuntimeException('Production cannot boot with APP_DEBUG enabled.');
        }

        if (! (bool) config('session.secure')) {
            throw new \RuntimeException('Production cannot boot without SESSION_SECURE_COOKIE enabled.');
        }
    }

    private function configureRateLimiting(): void
    {
        RateLimiter::for('auth-login', fn (Request $request) => Limit::perMinute(5)
            ->by($this->credentialRateLimitKey($request)));

        RateLimiter::for('auth-register', fn (Request $request) => Limit::perMinute(3)
            ->by($this->credentialRateLimitKey($request)));

        RateLimiter::for('reservation', fn (Request $request) => Limit::perMinute(10)
            ->by($this->userRateLimitKey($request)));

        RateLimiter::for('checkout', fn (Request $request) => Limit::perMinute(5)
            ->by($this->userRateLimitKey($request)));

        RateLimiter::for('scanner', fn (Request $request) => Limit::perMinute(30)
            ->by($this->scannerRateLimitKey($request)));

        RateLimiter::for('api-search', fn (Request $request) => Limit::perMinute(60)
            ->by($this->userRateLimitKey($request)));
    }

    private function credentialRateLimitKey(Request $request): string
    {
        $email = Str::lower((string) $request->input('email', 'guest'));

        return Str::transliterate($email.'|'.$request->ip());
    }

    private function userRateLimitKey(Request $request): string
    {
        return $request->user()
            ? 'user:'.$request->user()->id
            : 'ip:'.$request->ip();
    }

    private function scannerRateLimitKey(Request $request): string
    {
        return $this->userRateLimitKey($request).'|device:'.sha1((string) $request->userAgent());
    }
}
