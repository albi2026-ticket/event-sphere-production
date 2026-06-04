<?php

namespace Tests\Feature\Newsletter;

use App\Models\NewsletterSubscription;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NewsletterSubscriptionTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_can_subscribe_to_newsletter(): void
    {
        $response = $this->postJson('/api/newsletter-subscriptions', [
            'email' => 'fan@example.com',
            'source' => 'homepage',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.email', 'fan@example.com');

        $this->assertDatabaseHas('newsletter_subscriptions', [
            'email' => 'fan@example.com',
            'source' => 'homepage',
        ]);
    }

    public function test_existing_newsletter_subscription_is_updated(): void
    {
        NewsletterSubscription::query()->create([
            'email' => 'fan@example.com',
            'source' => 'footer',
            'subscribed_at' => now()->subDay(),
        ]);

        $response = $this->postJson('/api/newsletter-subscriptions', [
            'email' => 'fan@example.com',
            'source' => 'homepage',
        ]);

        $response->assertOk();

        $this->assertDatabaseCount('newsletter_subscriptions', 1);
        $this->assertDatabaseHas('newsletter_subscriptions', [
            'email' => 'fan@example.com',
            'source' => 'homepage',
        ]);
    }

    public function test_newsletter_subscription_requires_valid_email(): void
    {
        $response = $this->postJson('/api/newsletter-subscriptions', [
            'email' => 'not-an-email',
        ]);

        $response->assertUnprocessable()->assertJsonValidationErrors('email');
    }
}
