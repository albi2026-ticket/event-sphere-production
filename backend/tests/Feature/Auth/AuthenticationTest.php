<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_users_can_authenticate_using_the_login_screen(): void
    {
        $user = User::factory()->create();

        $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'password',
        ])
            ->assertOk()
            ->assertJsonPath('token_type', 'Bearer')
            ->assertJsonPath('user.email', $user->email);

        $this->assertDatabaseHas('personal_access_tokens', [
            'tokenable_type' => User::class,
            'tokenable_id' => $user->id,
        ]);
    }

    public function test_users_can_not_authenticate_with_invalid_password(): void
    {
        $user = User::factory()->create();

        $this->post('/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ]);

        $this->assertGuest();
    }

    public function test_inactive_users_can_not_receive_api_tokens(): void
    {
        foreach ([User::STATUS_SUSPENDED, User::STATUS_BANNED] as $status) {
            $user = User::factory()->create([
                'status' => $status,
                'last_login_at' => null,
            ]);

            $this->postJson('/api/login', [
                'email' => $user->email,
                'password' => 'password',
            ])
                ->assertUnprocessable()
                ->assertJsonValidationErrors('email')
                ->assertJsonPath('message', 'Your account has been suspended. Please contact support.');

            $this->assertDatabaseMissing('personal_access_tokens', [
                'tokenable_type' => User::class,
                'tokenable_id' => $user->id,
            ]);
            $this->assertNull($user->fresh()->last_login_at);
        }
    }

    public function test_users_can_logout(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test-device')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/logout')
            ->assertOk()
            ->assertJsonPath('message', 'Logged out.');

        $this->assertDatabaseMissing('personal_access_tokens', [
            'tokenable_type' => User::class,
            'tokenable_id' => $user->id,
        ]);
    }
}
