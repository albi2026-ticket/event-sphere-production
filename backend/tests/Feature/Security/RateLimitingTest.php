<?php

namespace Tests\Feature\Security;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RateLimitingTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        cache()->flush();

        parent::tearDown();
    }

    public function test_registration_is_limited_to_three_requests_per_minute(): void
    {
        for ($i = 0; $i < 3; $i++) {
            $this->postJson('/api/register', [
                'email' => 'limited@example.com',
            ])->assertUnprocessable();
        }

        $this->postJson('/api/register', [
            'email' => 'limited@example.com',
        ])->assertTooManyRequests();
    }

    public function test_public_search_endpoints_are_limited_to_sixty_requests_per_minute(): void
    {
        for ($i = 0; $i < 60; $i++) {
            $this->getJson('/api/events')->assertOk();
        }

        $this->getJson('/api/events')->assertTooManyRequests();
    }

    public function test_reservation_creation_is_limited_to_ten_requests_per_user_per_minute(): void
    {
        $user = User::factory()->create([
            'role' => User::ROLE_USER,
            'status' => User::STATUS_ACTIVE,
        ]);

        for ($i = 0; $i < 10; $i++) {
            $this->actingAs($user, 'sanctum')
                ->postJson('/api/reservations', [])
                ->assertUnprocessable();
        }

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/reservations', [])
            ->assertTooManyRequests();
    }

    public function test_checkout_creation_is_limited_to_five_requests_per_user_per_minute(): void
    {
        $user = User::factory()->create([
            'role' => User::ROLE_USER,
            'status' => User::STATUS_ACTIVE,
        ]);

        for ($i = 0; $i < 5; $i++) {
            $this->actingAs($user, 'sanctum')
                ->postJson('/api/orders', [])
                ->assertUnprocessable();
        }

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', [])
            ->assertTooManyRequests();
    }

    public function test_scanner_validation_is_limited_to_thirty_requests_per_user_device_per_minute(): void
    {
        $scanner = User::factory()->create([
            'role' => User::ROLE_SCANNER,
            'status' => User::STATUS_ACTIVE,
        ]);

        for ($i = 0; $i < 30; $i++) {
            $this->actingAs($scanner, 'sanctum')
                ->postJson('/api/scanner/tickets/validate', [])
                ->assertUnprocessable();
        }

        $this->actingAs($scanner, 'sanctum')
            ->postJson('/api/scanner/tickets/validate', [])
            ->assertTooManyRequests();
    }
}
