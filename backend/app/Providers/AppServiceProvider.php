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
use App\Support\Performance\ProfilingCacheManager;
use App\Support\Performance\ProfilingControllerDispatcher;
use App\Support\Performance\ProfilingResponseFactory;
use App\Support\AppUrls;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Contracts\Routing\ResponseFactory as ResponseFactoryContract;
use Illuminate\Http\Request;
use Illuminate\Routing\Contracts\ControllerDispatcher as ControllerDispatcherContract;
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
        $this->registerPerformanceProfilingBindings();
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
        if ($this->app->environment('production')) {
            URL::forceScheme('https');
        }

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

        $this->assertRequiredProductionEnvironment();

        if ((bool) config('app.debug')) {
            throw new \RuntimeException('Production cannot boot with APP_DEBUG enabled.');
        }

        if (! (bool) config('session.secure')) {
            throw new \RuntimeException('Production cannot boot without SESSION_SECURE_COOKIE enabled.');
        }

        if (! (bool) config('session.encrypt')) {
            throw new \RuntimeException('Production cannot boot without SESSION_ENCRYPT enabled.');
        }

        if (! (bool) config('session.http_only')) {
            throw new \RuntimeException('Production cannot boot without SESSION_HTTP_ONLY enabled.');
        }

        if (! in_array(config('session.same_site'), ['lax', 'strict', 'none'], true)) {
            throw new \RuntimeException('Production SESSION_SAME_SITE must be lax, strict, or none.');
        }

        if (! str_starts_with((string) config('app.url'), 'https://')) {
            throw new \RuntimeException('Production deployment requires APP_URL to use HTTPS.');
        }

        if (! filter_var((string) config('app.url'), FILTER_VALIDATE_URL)) {
            throw new \RuntimeException('Production deployment requires a valid APP_URL.');
        }

        if ((int) config('session.lifetime') < 15) {
            throw new \RuntimeException('Production SESSION_LIFETIME must be at least 15 minutes.');
        }

        $required = config('production.required_env', []);
        $trustedProxies = trim((string) ($required['TRUSTED_PROXIES'] ?? ''));

        if (in_array($trustedProxies, ['*', '**'], true)) {
            throw new \RuntimeException('Production TRUSTED_PROXIES must not trust every proxy. Use REMOTE_ADDR or explicit proxy CIDRs.');
        }

        if ((int) config('auth.guards.web.remember') <= 0) {
            throw new \RuntimeException('Production AUTH_REMEMBER_DURATION must be greater than zero.');
        }
    }

    private function registerPerformanceProfilingBindings(): void
    {
        $this->app->singleton(ControllerDispatcherContract::class, fn ($app): ProfilingControllerDispatcher => new ProfilingControllerDispatcher($app));

        $this->app->singleton(ResponseFactoryContract::class, fn ($app): ProfilingResponseFactory => new ProfilingResponseFactory(
            $app[\Illuminate\Contracts\View\Factory::class],
            $app['redirect'],
        ));

        $this->app->singleton('cache', fn ($app): ProfilingCacheManager => new ProfilingCacheManager($app));

        $this->app->singleton('cache.store', fn ($app): mixed => $app['cache']->driver());
    }

    private function assertRequiredProductionEnvironment(): void
    {
        $required = config('production.required_env', []);

        $missing = array_keys(array_filter($required, fn (mixed $value): bool => $this->productionEnvValueIsMissing($value)));

        if ($missing !== []) {
            throw new \RuntimeException('Production environment is missing required values: '.implode(', ', $missing));
        }

        if (config('app.env') !== 'production') {
            throw new \RuntimeException('Production deployment requires APP_ENV=production.');
        }

        $appDebug = $required['APP_DEBUG'] ?? null;

        if ($appDebug !== false && $appDebug !== 'false') {
            throw new \RuntimeException('Production deployment requires APP_DEBUG=false.');
        }
    }

    private function productionEnvValueIsMissing(mixed $value): bool
    {
        if ($value === null || $value === '') {
            return true;
        }

        $normalized = Str::lower(trim((string) $value));

        return str_contains($normalized, 'replace-with')
            || str_contains($normalized, 'your-')
            || str_contains($normalized, 'change_me')
            || str_contains($normalized, '<')
            || str_contains($normalized, '>');
    }

    private function configureRateLimiting(): void
    {
        RateLimiter::for('auth-login', fn (Request $request) => Limit::perMinute(config('rate_limits.auth_login_per_minute'))
            ->by($this->credentialRateLimitKey($request)));

        RateLimiter::for('auth-register', fn (Request $request) => Limit::perMinute(config('rate_limits.auth_register_per_minute'))
            ->by($this->credentialRateLimitKey($request)));

        RateLimiter::for('reservation', fn (Request $request) => Limit::perMinute(config('rate_limits.reservation_per_minute'))
            ->by($this->userRateLimitKey($request)));

        RateLimiter::for('checkout', fn (Request $request) => Limit::perMinute(config('rate_limits.checkout_per_minute'))
            ->by($this->userRateLimitKey($request)));

        RateLimiter::for('scanner', fn (Request $request) => Limit::perMinute(config('rate_limits.scanner_per_minute'))
            ->by($this->scannerRateLimitKey($request)));

        RateLimiter::for('api-search', fn (Request $request) => Limit::perMinute(config('rate_limits.api_search_per_minute'))
            ->by($this->userRateLimitKey($request)));

        RateLimiter::for('uploads', fn (Request $request) => Limit::perMinute(config('rate_limits.upload_per_minute'))
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
