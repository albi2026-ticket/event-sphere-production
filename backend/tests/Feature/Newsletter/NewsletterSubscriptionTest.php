<?php

namespace Tests\Feature\Newsletter;

use App\Mail\SubscriberWelcomeMail;
use App\Models\NewsletterSubscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class NewsletterSubscriptionTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_can_subscribe_to_newsletter(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/newsletter-subscriptions', [
            'email' => 'fan@example.com',
            'source' => 'events',
            'language' => 'sq',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.email', 'fan@example.com')
            ->assertJsonPath('data.source', 'events')
            ->assertJsonPath('data.language', 'sq')
            ->assertJsonPath('data.status', 'active');

        $this->assertDatabaseHas('newsletter_subscriptions', [
            'email' => 'fan@example.com',
            'source' => 'events',
            'language' => 'sq',
            'status' => 'active',
        ]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'newsletter_subscription.created']);
        Mail::assertQueued(SubscriberWelcomeMail::class);
    }

    public function test_existing_newsletter_subscription_is_updated(): void
    {
        Mail::fake();

        NewsletterSubscription::query()->create([
            'email' => 'fan@example.com',
            'source' => 'events',
            'language' => 'en',
            'status' => NewsletterSubscription::STATUS_UNSUBSCRIBED,
            'subscribed_at' => now()->subDay(),
            'unsubscribed_at' => now()->subHour(),
        ]);

        $response = $this->postJson('/api/newsletter-subscriptions', [
            'email' => 'fan@example.com',
            'source' => 'restaurants',
        ]);

        $response->assertOk();

        $this->assertDatabaseCount('newsletter_subscriptions', 1);
        $this->assertDatabaseHas('newsletter_subscriptions', [
            'email' => 'fan@example.com',
            'source' => 'restaurants',
            'status' => NewsletterSubscription::STATUS_ACTIVE,
            'unsubscribed_at' => null,
        ]);
        Mail::assertQueued(SubscriberWelcomeMail::class);
    }

    public function test_newsletter_subscription_requires_valid_email(): void
    {
        $response = $this->postJson('/api/newsletter-subscriptions', [
            'email' => 'not-an-email',
        ]);

        $response->assertUnprocessable()->assertJsonValidationErrors('email');
    }

    public function test_unsubscribe_marks_subscription_without_deleting_it(): void
    {
        $subscription = NewsletterSubscription::query()->create([
            'email' => 'fan@example.com',
            'source' => 'events',
            'language' => 'en',
            'status' => NewsletterSubscription::STATUS_ACTIVE,
            'subscribed_at' => now(),
        ]);

        $url = URL::signedRoute('newsletter-subscriptions.unsubscribe', [
            'newsletterSubscription' => $subscription,
        ]);

        $this->get($url)->assertOk();

        $this->assertDatabaseHas('newsletter_subscriptions', [
            'id' => $subscription->id,
            'email' => 'fan@example.com',
            'status' => NewsletterSubscription::STATUS_UNSUBSCRIBED,
        ]);
        $this->assertDatabaseCount('newsletter_subscriptions', 1);
    }

    public function test_admin_can_view_filter_and_export_subscribers(): void
    {
        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
            'status' => User::STATUS_ACTIVE,
        ]);

        NewsletterSubscription::query()->create([
            'email' => 'events@example.com',
            'source' => 'events',
            'language' => 'en',
            'status' => NewsletterSubscription::STATUS_ACTIVE,
            'subscribed_at' => now(),
        ]);
        NewsletterSubscription::query()->create([
            'email' => 'restaurants@example.com',
            'source' => 'restaurants',
            'language' => 'sq',
            'status' => NewsletterSubscription::STATUS_UNSUBSCRIBED,
            'subscribed_at' => now()->subDay(),
            'unsubscribed_at' => now(),
        ]);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/subscribers?source=restaurants&status=unsubscribed')
            ->assertOk()
            ->assertJsonPath('data.meta.total', 1)
            ->assertJsonPath('data.subscribers.0.email', 'restaurants@example.com')
            ->assertJsonPath('data.summary.total', 2)
            ->assertJsonPath('data.summary.by_source.restaurants', 1);

        $this->actingAs($admin, 'sanctum')
            ->get('/api/admin/subscribers/export?source=restaurants')
            ->assertOk()
            ->assertHeader('content-type', 'text/csv; charset=UTF-8');
    }
}
