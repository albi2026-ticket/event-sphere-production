<?php

namespace Tests\Feature\Venues;

use App\Mail\ReservationCancelledMail;
use App\Mail\ReservationConfirmedMail;
use App\Models\Reservation;
use App\Models\User;
use App\Models\Venue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class OwnerReservationManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_list_only_own_venue_reservations_with_stats(): void
    {
        $owner = $this->organizer();
        $otherOwner = $this->organizer();
        $venue = $this->venue($owner, ['name' => 'Owner Venue', 'slug' => 'owner-venue']);
        $otherVenue = $this->venue($otherOwner, ['name' => 'Other Venue', 'slug' => 'other-venue']);
        $user = $this->user();

        $today = $this->reservation($venue, $user, ['reservation_date' => today()->format('Y-m-d')]);
        $this->reservation($venue, $user, ['status' => Reservation::STATUS_COMPLETED]);
        $this->reservation($venue, $user, ['status' => Reservation::STATUS_CANCELLED]);
        $this->reservation($otherVenue, $user);

        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/owner/reservations')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('meta.stats.today', 1)
            ->assertJsonPath('meta.stats.completed', 1)
            ->assertJsonPath('meta.stats.cancelled', 1);

        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/owner/reservations?view=today')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $today->id);
    }

    public function test_owner_reservation_access_is_scoped_to_owned_venues_and_admin_can_access_all(): void
    {
        $owner = $this->organizer();
        $otherOwner = $this->organizer();
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN, 'status' => User::STATUS_ACTIVE]);
        $reservation = $this->reservation($this->venue($owner), $this->user());

        $this->actingAs($otherOwner, 'sanctum')
            ->getJson("/api/owner/reservations/{$reservation->id}")
            ->assertForbidden();

        $this->actingAs($owner, 'sanctum')
            ->getJson("/api/owner/reservations/{$reservation->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $reservation->id);

        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/owner/reservations/{$reservation->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $reservation->id);
    }

    public function test_owner_can_confirm_cancel_and_complete_reservations(): void
    {
        Mail::fake();

        $owner = $this->organizer();
        $user = $this->user(['email' => 'guest@example.test']);
        $venue = $this->venue($owner);
        $pending = $this->reservation($venue, $user, ['status' => Reservation::STATUS_PENDING]);
        $confirmed = $this->reservation($venue, $user, ['status' => Reservation::STATUS_CONFIRMED]);
        $toComplete = $this->reservation($venue, $user, ['status' => Reservation::STATUS_CONFIRMED]);

        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/owner/reservations/{$pending->id}/confirm")
            ->assertOk()
            ->assertJsonPath('data.status', Reservation::STATUS_CONFIRMED);

        Mail::assertSent(ReservationConfirmedMail::class, fn ($mail) => $mail->hasTo('guest@example.test'));

        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/owner/reservations/{$confirmed->id}/cancel")
            ->assertOk()
            ->assertJsonPath('data.status', Reservation::STATUS_CANCELLED);

        Mail::assertSent(ReservationCancelledMail::class, fn ($mail) => $mail->hasTo('guest@example.test'));

        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/owner/reservations/{$toComplete->id}/complete")
            ->assertOk()
            ->assertJsonPath('data.status', Reservation::STATUS_COMPLETED);
    }

    private function organizer(array $attributes = []): User
    {
        return User::factory()->create(array_merge([
            'role' => User::ROLE_ORGANIZER,
            'status' => User::STATUS_ACTIVE,
            'organizer_status' => User::ORGANIZER_STATUS_APPROVED,
        ], $attributes));
    }

    private function user(array $attributes = []): User
    {
        return User::factory()->create(array_merge([
            'role' => User::ROLE_USER,
            'status' => User::STATUS_ACTIVE,
        ], $attributes));
    }

    private function venue(User $owner, array $attributes = []): Venue
    {
        return Venue::query()->create(array_merge([
            'user_id' => $owner->id,
            'name' => 'Reservation Venue',
            'slug' => 'reservation-venue-'.uniqid(),
            'venue_type' => Venue::TYPE_RESTAURANT,
            'city' => 'Pristina',
            'status' => Venue::STATUS_ACTIVE,
            'reservation_enabled' => true,
            'min_guests' => 1,
            'max_guests' => 8,
        ], $attributes));
    }

    private function reservation(Venue $venue, User $user, array $attributes = []): Reservation
    {
        return Reservation::query()->create(array_merge([
            'venue_id' => $venue->id,
            'user_id' => $user->id,
            'guest_name' => $user->name,
            'phone' => '+38344111222',
            'party_size' => 2,
            'reservation_date' => now()->addDay()->format('Y-m-d'),
            'reservation_time' => '19:00',
            'status' => Reservation::STATUS_CONFIRMED,
        ], $attributes));
    }
}
