<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_users_can_register(): void
    {
        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertNoContent();
    }

    public function test_owner_role_can_register_through_api(): void
    {
        $this->postJson('/api/register', [
            'name' => 'Venue Owner',
            'email' => 'owner@example.test',
            'password' => 'password',
            'password_confirmation' => 'password',
            'role' => User::ROLE_OWNER,
        ])
            ->assertCreated()
            ->assertJsonPath('user.role', User::ROLE_OWNER)
            ->assertJsonPath('user.organizer_status', User::ORGANIZER_STATUS_NONE);

        $this->assertDatabaseHas('users', [
            'email' => 'owner@example.test',
            'role' => User::ROLE_OWNER,
            'organizer_status' => User::ORGANIZER_STATUS_NONE,
        ]);
    }
}
