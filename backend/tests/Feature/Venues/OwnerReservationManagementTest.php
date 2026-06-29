<?php

namespace Tests\Feature\Venues;

use App\Mail\ReservationCancelledMail;
use App\Mail\ReservationCompletedMail;
use App\Mail\ReservationConfirmedMail;
use App\Mail\ReservationNoShowMail;
use App\Models\Notification;
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
        $this->reservation($venue, $user, ['status' => Reservation::STATUS_PENDING]);
        $this->reservation($venue, $user, ['status' => Reservation::STATUS_COMPLETED]);
        $this->reservation($venue, $user, ['status' => Reservation::STATUS_CANCELLED]);
        $this->reservation($otherVenue, $user);

        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/owner/reservations')
            ->assertOk()
            ->assertJsonCount(4, 'data')
            ->assertJsonPath('meta.stats.pending', 1)
            ->assertJsonPath('meta.stats.confirmed', 1)
            ->assertJsonPath('meta.stats.today', 1)
            ->assertJsonPath('meta.stats.completed', 1)
            ->assertJsonPath('meta.stats.cancelled', 1);

        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/owner/reservations?view=today')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $today->id);
    }

    public function test_owner_role_can_manage_own_venue_reservations(): void
    {
        Mail::fake();

        $owner = $this->owner();
        $venue = $this->venue($owner);
        $reservation = $this->reservation($venue, $this->user(), [
            'status' => Reservation::STATUS_PENDING,
        ]);

        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/owner/reservations')
            ->assertOk()
            ->assertJsonPath('data.0.id', $reservation->id);

        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/owner/reservations/{$reservation->id}/confirm")
            ->assertOk()
            ->assertJsonPath('data.status', Reservation::STATUS_CONFIRMED);
    }

    public function test_organizer_role_cannot_access_restaurant_management_routes(): void
    {
        $organizer = $this->actualOrganizer();

        $this->actingAs($organizer, 'sanctum')
            ->getJson('/api/owner/reservations')
            ->assertForbidden();

        $this->actingAs($organizer, 'sanctum')
            ->getJson('/api/owner/venues')
            ->assertForbidden();
    }

    public function test_owner_reservation_list_orders_newest_requests_first(): void
    {
        $owner = $this->organizer();
        $venue = $this->venue($owner);
        $user = $this->user();

        $oldest = $this->reservation($venue, $user, [
            'status' => Reservation::STATUS_PENDING,
        ]);
        $newest = $this->reservation($venue, $user, [
            'status' => Reservation::STATUS_COMPLETED,
        ]);
        $middle = $this->reservation($venue, $user, [
            'status' => Reservation::STATUS_CANCELLED,
        ]);
        $oldest->forceFill(['created_at' => now()->subHours(3)])->save();
        $newest->forceFill(['created_at' => now()->subMinute()])->save();
        $middle->forceFill(['created_at' => now()->subHour()])->save();

        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/owner/reservations')
            ->assertOk()
            ->assertJsonPath('data.0.id', $newest->id)
            ->assertJsonPath('data.1.id', $middle->id)
            ->assertJsonPath('data.2.id', $oldest->id);

        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/owner/reservations?status=pending')
            ->assertOk()
            ->assertJsonPath('data.0.id', $oldest->id);
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

    public function test_owner_calendar_returns_only_owned_reservations_for_selected_period(): void
    {
        $owner = $this->organizer();
        $otherOwner = $this->organizer();
        $venue = $this->venue($owner, ['name' => 'Calendar Venue']);
        $otherVenue = $this->venue($otherOwner, ['name' => 'Other Calendar Venue']);
        $user = $this->user();
        $start = now()->addDays(2)->format('Y-m-d');
        $end = now()->addDays(8)->format('Y-m-d');

        $included = $this->reservation($venue, $user, [
            'guest_name' => 'Calendar Guest',
            'reservation_date' => now()->addDays(3)->format('Y-m-d'),
            'reservation_time' => '19:30',
            'party_size' => 4,
            'status' => Reservation::STATUS_PENDING,
        ]);
        $this->reservation($venue, $user, ['reservation_date' => now()->addDays(20)->format('Y-m-d')]);
        $this->reservation($otherVenue, $user, ['reservation_date' => now()->addDays(3)->format('Y-m-d')]);

        $this->actingAs($owner, 'sanctum')
            ->getJson("/api/owner/reservations/calendar?start_date={$start}&end_date={$end}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $included->id)
            ->assertJsonPath('data.0.guest_name', 'Calendar Guest')
            ->assertJsonPath('data.0.reservation_time', '19:30')
            ->assertJsonPath('data.0.party_size', 4)
            ->assertJsonPath('data.0.status', Reservation::STATUS_PENDING)
            ->assertJsonPath('meta.period.start_date', $start)
            ->assertJsonPath('meta.period.end_date', $end);
    }

    public function test_owner_calendar_orders_newest_requests_first(): void
    {
        $owner = $this->organizer();
        $venue = $this->venue($owner);
        $user = $this->user();
        $date = now()->addDays(3)->format('Y-m-d');

        $oldest = $this->reservation($venue, $user, [
            'reservation_date' => $date,
            'reservation_time' => '20:00',
        ]);
        $newest = $this->reservation($venue, $user, [
            'reservation_date' => $date,
            'reservation_time' => '18:00',
        ]);
        $oldest->forceFill(['created_at' => now()->subHours(2)])->save();
        $newest->forceFill(['created_at' => now()->subMinute()])->save();

        $this->actingAs($owner, 'sanctum')
            ->getJson("/api/owner/reservations/calendar?start_date={$date}&end_date={$date}")
            ->assertOk()
            ->assertJsonPath('data.0.id', $newest->id)
            ->assertJsonPath('data.1.id', $oldest->id);
    }

    public function test_owner_calendar_filters_status_and_venue_and_returns_today_summary(): void
    {
        $owner = $this->organizer();
        $venue = $this->venue($owner, ['name' => 'Main Venue']);
        $otherVenue = $this->venue($owner, ['name' => 'Second Venue']);
        $user = $this->user();
        $today = today()->format('Y-m-d');
        $end = today()->addDays(7)->format('Y-m-d');

        $confirmed = $this->reservation($venue, $user, [
            'reservation_date' => $today,
            'status' => Reservation::STATUS_CONFIRMED,
        ]);
        $this->reservation($venue, $user, [
            'reservation_date' => $today,
            'status' => Reservation::STATUS_PENDING,
        ]);
        $this->reservation($otherVenue, $user, [
            'reservation_date' => $today,
            'status' => Reservation::STATUS_CONFIRMED,
        ]);
        $this->reservation($venue, $user, [
            'reservation_date' => $today,
            'status' => Reservation::STATUS_CANCELLED,
        ]);

        $this->actingAs($owner, 'sanctum')
            ->getJson("/api/owner/reservations/calendar?start_date={$today}&end_date={$end}&status=confirmed&venue_id={$venue->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $confirmed->id)
            ->assertJsonPath('meta.today_summary.total', 3)
            ->assertJsonPath('meta.today_summary.pending', 1)
            ->assertJsonPath('meta.today_summary.confirmed', 1)
            ->assertJsonPath('meta.today_summary.cancelled', 1);
    }

    public function test_owner_calendar_rejects_large_ranges(): void
    {
        $owner = $this->organizer();
        $start = today()->format('Y-m-d');
        $end = today()->addDays(90)->format('Y-m-d');

        $this->actingAs($owner, 'sanctum')
            ->getJson("/api/owner/reservations/calendar?start_date={$start}&end_date={$end}")
            ->assertUnprocessable();
    }

    public function test_owner_analytics_returns_reservation_metrics_for_owned_venues(): void
    {
        $owner = $this->organizer();
        $otherOwner = $this->organizer();
        $venue = $this->venue($owner);
        $otherVenue = $this->venue($otherOwner);
        $user = $this->user();
        $start = today()->subDays(6)->format('Y-m-d');
        $end = today()->format('Y-m-d');

        $this->reservation($venue, $user, ['reservation_date' => today()->subDays(2)->format('Y-m-d'), 'reservation_time' => '18:00', 'status' => Reservation::STATUS_PENDING]);
        $this->reservation($venue, $user, ['reservation_date' => today()->subDay()->format('Y-m-d'), 'reservation_time' => '19:00', 'status' => Reservation::STATUS_CONFIRMED]);
        $this->reservation($venue, $user, ['reservation_date' => today()->format('Y-m-d'), 'reservation_time' => '19:00', 'status' => Reservation::STATUS_COMPLETED]);
        $this->reservation($venue, $user, ['reservation_date' => today()->format('Y-m-d'), 'reservation_time' => '20:00', 'status' => Reservation::STATUS_CANCELLED]);
        $this->reservation($venue, $user, ['reservation_date' => today()->format('Y-m-d'), 'reservation_time' => '21:00', 'status' => Reservation::STATUS_NO_SHOW]);
        $this->reservation($otherVenue, $user, ['reservation_date' => today()->format('Y-m-d'), 'status' => Reservation::STATUS_COMPLETED]);

        $this->actingAs($owner, 'sanctum')
            ->getJson("/api/owner/analytics?start_date={$start}&end_date={$end}&venue_id={$venue->id}")
            ->assertOk()
            ->assertJsonPath('data.overview.total', 5)
            ->assertJsonPath('data.overview.pending', 1)
            ->assertJsonPath('data.overview.confirmed', 1)
            ->assertJsonPath('data.overview.completed', 1)
            ->assertJsonPath('data.overview.cancelled', 1)
            ->assertJsonPath('data.overview.no_show', 1)
            ->assertJsonPath('data.today.reservations', 3)
            ->assertJsonPath('data.today.completed', 1)
            ->assertJsonPath('data.today.cancelled', 1)
            ->assertJsonPath('data.today.no_show', 1)
            ->assertJsonPath('data.month.reservations', 5)
            ->assertJsonPath('data.rates.completion_rate', 20)
            ->assertJsonPath('data.rates.cancellation_rate', 20)
            ->assertJsonPath('data.rates.no_show_rate', 100)
            ->assertJsonCount(7, 'data.trend')
            ->assertJsonPath('data.status_breakdown.4.status', Reservation::STATUS_NO_SHOW)
            ->assertJsonPath('data.top_time_slots.0.time', '19:00');
    }

    public function test_owner_analytics_rejects_another_owners_venue(): void
    {
        $owner = $this->organizer();
        $otherOwner = $this->organizer();
        $otherVenue = $this->venue($otherOwner);

        $this->actingAs($owner, 'sanctum')
            ->getJson("/api/owner/analytics?venue_id={$otherVenue->id}")
            ->assertForbidden();
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
        $noShow = $this->reservation($venue, $user, ['status' => Reservation::STATUS_CONFIRMED]);

        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/owner/reservations/{$pending->id}/confirm")
            ->assertOk()
            ->assertJsonPath('data.status', Reservation::STATUS_CONFIRMED);

        Mail::assertSent(ReservationConfirmedMail::class, fn ($mail) => $mail->hasTo('guest@example.test'));

        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/owner/reservations/{$confirmed->id}/cancel", [
                'owner_cancellation_reason' => 'Private event',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', Reservation::STATUS_CANCELLED)
            ->assertJsonPath('data.owner_cancellation_reason', 'Private event');

        Mail::assertSent(ReservationCancelledMail::class, fn ($mail) => $mail->hasTo('guest@example.test'));
        $this->assertDatabaseHas('notifications', [
            'user_id' => $user->id,
            'type' => Notification::TYPE_RESERVATION_CANCELLED,
            'message' => "Your reservation at {$venue->name} was cancelled. Reason: Private event",
        ]);

        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/owner/reservations/{$toComplete->id}/complete")
            ->assertOk()
            ->assertJsonPath('data.status', Reservation::STATUS_COMPLETED);

        Mail::assertSent(ReservationCompletedMail::class, fn ($mail) => $mail->hasTo('guest@example.test'));
        $this->assertDatabaseHas('notifications', [
            'user_id' => $user->id,
            'type' => Notification::TYPE_RESERVATION_COMPLETED,
            'title' => 'Reservation Completed',
        ]);

        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/owner/reservations/{$noShow->id}/no-show")
            ->assertOk()
            ->assertJsonPath('data.status', Reservation::STATUS_NO_SHOW);

        Mail::assertSent(ReservationNoShowMail::class, fn ($mail) => $mail->hasTo('guest@example.test'));
        $this->assertDatabaseHas('notifications', [
            'user_id' => $user->id,
            'type' => Notification::TYPE_RESERVATION_NO_SHOW,
            'title' => 'Reservation Marked As No Show',
        ]);
    }

    public function test_owner_lifecycle_blocks_invalid_completion_and_no_show_transitions(): void
    {
        Mail::fake();

        $owner = $this->organizer();
        $user = $this->user();
        $venue = $this->venue($owner);
        $pending = $this->reservation($venue, $user, ['status' => Reservation::STATUS_PENDING]);
        $cancelled = $this->reservation($venue, $user, ['status' => Reservation::STATUS_CANCELLED]);
        $completed = $this->reservation($venue, $user, ['status' => Reservation::STATUS_COMPLETED]);
        $noShow = $this->reservation($venue, $user, ['status' => Reservation::STATUS_NO_SHOW]);

        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/owner/reservations/{$pending->id}/complete")
            ->assertUnprocessable();

        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/owner/reservations/{$pending->id}/no-show")
            ->assertUnprocessable();

        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/owner/reservations/{$cancelled->id}/complete")
            ->assertUnprocessable();

        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/owner/reservations/{$cancelled->id}/no-show")
            ->assertUnprocessable();

        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/owner/reservations/{$completed->id}/no-show")
            ->assertUnprocessable();

        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/owner/reservations/{$noShow->id}/complete")
            ->assertUnprocessable();

        Mail::assertNotSent(ReservationCompletedMail::class);
        Mail::assertNotSent(ReservationNoShowMail::class);
    }

    public function test_unverified_owner_cannot_manage_reservations(): void
    {
        $owner = $this->organizer(['email_verified_at' => null]);
        $venue = $this->venue($owner);
        $reservation = $this->reservation($venue, $this->user(), [
            'status' => Reservation::STATUS_PENDING,
        ]);

        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/owner/reservations')
            ->assertForbidden()
            ->assertJsonPath('message', 'Please verify your email address before managing restaurant or bar reservations.');

        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/owner/reservations/{$reservation->id}/confirm")
            ->assertForbidden()
            ->assertJsonPath('message', 'Please verify your email address before managing restaurant or bar reservations.');

        $this->assertDatabaseHas('reservations', [
            'id' => $reservation->id,
            'status' => Reservation::STATUS_PENDING,
        ]);
    }

    private function organizer(array $attributes = []): User
    {
        return User::factory()->create(array_merge([
            'role' => User::ROLE_OWNER,
            'status' => User::STATUS_ACTIVE,
            'organizer_status' => User::ORGANIZER_STATUS_NONE,
        ], $attributes));
    }

    private function actualOrganizer(array $attributes = []): User
    {
        return User::factory()->create(array_merge([
            'role' => User::ROLE_ORGANIZER,
            'status' => User::STATUS_ACTIVE,
            'organizer_status' => User::ORGANIZER_STATUS_APPROVED,
        ], $attributes));
    }

    private function owner(array $attributes = []): User
    {
        return User::factory()->create(array_merge([
            'role' => User::ROLE_OWNER,
            'status' => User::STATUS_ACTIVE,
            'organizer_status' => User::ORGANIZER_STATUS_NONE,
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
