<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_reset_password_link_can_be_requested(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->postJson('/api/forgot-password', ['email' => $user->email])
            ->assertOk()
            ->assertJsonStructure(['status']);

        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use ($user) {
            $mail = $notification->toMail($user);

            $this->assertSame('Reset your Event Sphere password', $mail->subject);
            $this->assertSame([
                'html' => 'emails.auth.reset-password',
                'text' => 'emails.auth.reset-password-text',
            ], $mail->view);

            $resetUrl = $mail->viewData['resetUrl'];
            $parts = parse_url($resetUrl);
            parse_str($parts['query'] ?? '', $query);
            $frontendUrl = rtrim((string) config('services.frontend.url'), '/');

            $this->assertStringStartsWith($frontendUrl.'/site/reset-password.html?', $resetUrl);
            $this->assertSame(parse_url($frontendUrl, PHP_URL_HOST), $parts['host'] ?? null);
            $this->assertSame(parse_url($frontendUrl, PHP_URL_PORT), $parts['port'] ?? null);
            $this->assertSame('/site/reset-password.html', $parts['path'] ?? null);
            $this->assertSame($notification->token, $query['token'] ?? null);
            $this->assertSame($user->email, $query['email'] ?? null);

            return true;
        });
    }

    public function test_reset_password_link_requires_existing_user_email(): void
    {
        Notification::fake();

        $this->postJson('/api/forgot-password', ['email' => 'missing@example.test'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);

        Notification::assertNothingSent();
    }

    public function test_password_can_be_reset_with_valid_token(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->postJson('/api/forgot-password', ['email' => $user->email]);

        Notification::assertSentTo($user, ResetPassword::class, function (object $notification) use ($user) {
            $response = $this->postJson('/api/reset-password', [
                'token' => $notification->token,
                'email' => $user->email,
                'password' => 'new-password-123',
                'password_confirmation' => 'new-password-123',
            ]);

            $response
                ->assertOk()
                ->assertJsonStructure(['status']);

            $this->postJson('/api/login', [
                'email' => $user->email,
                'password' => 'new-password-123',
                'device_name' => 'password-reset-test',
            ])->assertOk()
                ->assertJsonStructure(['token', 'user']);

            return true;
        });
    }

    public function test_password_reset_token_cannot_be_reused(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->postJson('/api/forgot-password', ['email' => $user->email]);

        Notification::assertSentTo($user, ResetPassword::class, function (object $notification) use ($user) {
            $payload = [
                'token' => $notification->token,
                'email' => $user->email,
                'password' => 'new-password-123',
                'password_confirmation' => 'new-password-123',
            ];

            $this->postJson('/api/reset-password', $payload)->assertOk();
            $this->postJson('/api/reset-password', $payload)
                ->assertUnprocessable()
                ->assertJsonValidationErrors(['email']);

            return true;
        });
    }
}
