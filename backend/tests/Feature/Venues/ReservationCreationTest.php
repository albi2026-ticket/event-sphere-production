<?php

namespace Tests\Feature\Venues;

use App\Mail\NewReservationReceivedMail;
use App\Mail\ReservationCancelledMail;
use App\Mail\ReservationConfirmedMail;
use App\Mail\ReservationRequestReceivedMail;
use App\Models\Reservation;
use App\Models\User;
use App\Models\Venue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class ReservationCreationTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_create_reservation_and_emails_are_sent(): void
    {
        Mail::fake();

        $owner = $this->organizer(['email' => 'owner@example.test']);
        $user = User::factory()->create([
            'name' => 'Jamie Guest',
            'email' => 'guest@example.test',
            'phone' => '+38344111222',
            'role' => User::ROLE_USER,
            'status' => User::STATUS_ACTIVE,
        ]);
        $venue = $this->venue($owner);

        $reservationId = $this->actingAs($user, 'sanctum')
            ->postJson('/api/reservations', [
                'venue_id' => $venue->id,
                'party_size' => 4,
                'reservation_date' => now()->addDay()->format('Y-m-d'),
                'reservation_time' => '19:30',
                'notes' => 'Window table if available.',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', Reservation::STATUS_PENDING)
            ->assertJsonPath('data.guest_name', 'Jamie Guest')
            ->assertJsonPath('data.phone', '+38344111222')
            ->assertJsonPath('data.party_size', 4)
            ->json('data.id');

        $this->assertDatabaseHas('reservations', [
            'id' => $reservationId,
            'venue_id' => $venue->id,
            'user_id' => $user->id,
            'status' => Reservation::STATUS_PENDING,
        ]);

        Mail::assertSent(ReservationRequestReceivedMail::class, fn ($mail) => $mail->hasTo('guest@example.test'));
        Mail::assertSent(NewReservationReceivedMail::class, fn ($mail) => $mail->hasTo('owner@example.test'));
        Mail::assertNotSent(ReservationConfirmedMail::class);
    }

    public function test_my_reservations_and_show_are_limited_to_authenticated_user(): void
    {
        $owner = $this->organizer();
        $user = User::factory()->create(['role' => User::ROLE_USER, 'status' => User::STATUS_ACTIVE]);
        $otherUser = User::factory()->create(['role' => User::ROLE_USER, 'status' => User::STATUS_ACTIVE]);
        $venue = $this->venue($owner);

        $mine = Reservation::query()->create([
            'venue_id' => $venue->id,
            'user_id' => $user->id,
            'guest_name' => $user->name,
            'party_size' => 2,
            'reservation_date' => now()->addDay()->format('Y-m-d'),
            'reservation_time' => '18:00',
            'status' => Reservation::STATUS_CONFIRMED,
        ]);
        $other = Reservation::query()->create([
            'venue_id' => $venue->id,
            'user_id' => $otherUser->id,
            'guest_name' => $otherUser->name,
            'party_size' => 2,
            'reservation_date' => now()->addDay()->format('Y-m-d'),
            'reservation_time' => '20:00',
            'status' => Reservation::STATUS_CONFIRMED,
        ]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/my-reservations')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $mine->id);

        $this->actingAs($user, 'sanctum')
            ->getJson("/api/reservations/{$mine->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $mine->id);

        $this->actingAs($user, 'sanctum')
            ->getJson("/api/reservations/{$other->id}")
            ->assertForbidden();
    }

    public function test_user_can_cancel_only_their_own_pending_reservation(): void
    {
        Mail::fake();

        $owner = $this->organizer();
        $user = User::factory()->create(['role' => User::ROLE_USER, 'status' => User::STATUS_ACTIVE]);
        $otherUser = User::factory()->create(['role' => User::ROLE_USER, 'status' => User::STATUS_ACTIVE]);
        $venue = $this->venue($owner);
        $pending = Reservation::query()->create([
            'venue_id' => $venue->id,
            'user_id' => $user->id,
            'guest_name' => $user->name,
            'party_size' => 2,
            'reservation_date' => now()->addDay()->format('Y-m-d'),
            'reservation_time' => '18:00',
            'status' => Reservation::STATUS_PENDING,
        ]);
        $confirmed = Reservation::query()->create([
            'venue_id' => $venue->id,
            'user_id' => $user->id,
            'guest_name' => $user->name,
            'party_size' => 2,
            'reservation_date' => now()->addDays(2)->format('Y-m-d'),
            'reservation_time' => '19:00',
            'status' => Reservation::STATUS_CONFIRMED,
        ]);

        $this->actingAs($otherUser, 'sanctum')
            ->patchJson("/api/reservations/{$pending->id}/cancel")
            ->assertForbidden();

        $this->actingAs($user, 'sanctum')
            ->patchJson("/api/reservations/{$confirmed->id}/cancel")
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Only pending reservations can be cancelled.');

        $this->actingAs($user, 'sanctum')
            ->patchJson("/api/reservations/{$pending->id}/cancel")
            ->assertOk()
            ->assertJsonPath('data.status', Reservation::STATUS_CANCELLED);

        $this->assertDatabaseHas('reservations', [
            'id' => $pending->id,
            'status' => Reservation::STATUS_CANCELLED,
        ]);
        Mail::assertSent(ReservationCancelledMail::class, fn ($mail) => $mail->hasTo($user->email));
    }

    public function test_reservation_validation_uses_clean_messages(): void
    {
        $owner = $this->organizer();
        $user = User::factory()->create(['role' => User::ROLE_USER, 'status' => User::STATUS_ACTIVE]);
        $venue = $this->venue($owner, ['min_guests' => 2, 'max_guests' => 6]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/reservations', [
                'venue_id' => $venue->id,
                'party_size' => 1,
                'reservation_date' => now()->addDay()->format('Y-m-d'),
                'reservation_time' => '19:30',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('party_size')
            ->assertJsonPath('errors.party_size.0', 'Please select between 2 and 6 guests.');

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/reservations', [
                'venue_id' => $venue->id,
                'party_size' => 2,
                'reservation_date' => now()->subDay()->format('Y-m-d'),
                'reservation_time' => '19:30',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('reservation_date')
            ->assertJsonPath('errors.reservation_date.0', 'Please select a future date and time.');
    }

    public function test_inactive_or_disabled_venue_cannot_be_reserved(): void
    {
        $owner = $this->organizer();
        $user = User::factory()->create(['role' => User::ROLE_USER, 'status' => User::STATUS_ACTIVE]);
        $venue = $this->venue($owner, ['reservation_enabled' => false]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/reservations', [
                'venue_id' => $venue->id,
                'party_size' => 2,
                'reservation_date' => now()->addDay()->format('Y-m-d'),
                'reservation_time' => '19:30',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('venue_id')
            ->assertJsonPath('errors.venue_id.0', 'This venue is not available for reservations.');
    }

    public function test_only_venue_owner_or_admin_can_cancel_reservation_from_owner_endpoint(): void
    {
        $owner = $this->organizer();
        $otherOwner = $this->organizer();
        $user = User::factory()->create(['role' => User::ROLE_USER, 'status' => User::STATUS_ACTIVE]);
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN, 'status' => User::STATUS_ACTIVE]);
        $venue = $this->venue($owner);
        $reservation = Reservation::query()->create([
            'venue_id' => $venue->id,
            'user_id' => $user->id,
            'guest_name' => $user->name,
            'party_size' => 2,
            'reservation_date' => now()->addDay()->format('Y-m-d'),
            'reservation_time' => '19:00',
            'status' => Reservation::STATUS_CONFIRMED,
        ]);

        $this->actingAs($user, 'sanctum')
            ->patchJson("/api/owner/reservations/{$reservation->id}/cancel")
            ->assertForbidden();

        $this->actingAs($otherOwner, 'sanctum')
            ->patchJson("/api/owner/reservations/{$reservation->id}/cancel")
            ->assertForbidden();

        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/owner/reservations/{$reservation->id}/cancel")
            ->assertOk()
            ->assertJsonPath('data.status', Reservation::STATUS_CANCELLED);

        $reservation->update(['status' => Reservation::STATUS_CONFIRMED]);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/owner/reservations/{$reservation->id}/cancel")
            ->assertOk()
            ->assertJsonPath('data.status', Reservation::STATUS_CANCELLED);
    }

    private function organizer(array $attributes = []): User
    {
        return User::factory()->create(array_merge([
            'role' => User::ROLE_ORGANIZER,
            'status' => User::STATUS_ACTIVE,
            'organizer_status' => User::ORGANIZER_STATUS_APPROVED,
        ], $attributes));
    }

    private function venue(User $owner, array $attributes = []): Venue
    {
        return Venue::query()->create(array_merge([
            'user_id' => $owner->id,
            'name' => 'Reservation Room',
            'slug' => 'reservation-room-'.uniqid(),
            'venue_type' => Venue::TYPE_RESTAURANT,
            'city' => 'Pristina',
            'status' => Venue::STATUS_ACTIVE,
            'reservation_enabled' => true,
            'min_guests' => 1,
            'max_guests' => 8,
        ], $attributes));
    }
}
