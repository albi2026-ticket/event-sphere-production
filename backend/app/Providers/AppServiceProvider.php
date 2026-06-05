<?php

namespace App\Providers;

use App\Models\Event;
use App\Models\Ticket;
use App\Policies\EventPolicy;
use App\Policies\TicketPolicy;
use Illuminate\Auth\Notifications\ResetPassword;
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

        ResetPassword::createUrlUsing(function (object $notifiable, string $token) {
            return rtrim((string) config('services.frontend.url'), '/')."/password-reset/$token?email={$notifiable->getEmailForPasswordReset()}";
        });
    }
}
