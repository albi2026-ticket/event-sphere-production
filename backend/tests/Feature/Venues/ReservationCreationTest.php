<?php

namespace Tests\Feature\Venues;

use App\Mail\NewReservationReceivedMail;
use App\Mail\ReservationCancelledMail;
use App\Mail\ReservationCancelledByGuestMail;
use App\Mail\ReservationConfirmedMail;
use App\Mail\ReservationRequestReceivedMail;
use App\Models\Notification;
use App\Models\Reservation;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueBlackoutDate;
use App\Models\VenueSpecialHour;
use App\Services\Reservations\ReservationCreationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
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

    public function test_unverified_user_cannot_create_reservation(): void
    {
        $owner = $this->organizer();
        $user = User::factory()->unverified()->create([
            'role' => User::ROLE_USER,
            'status' => User::STATUS_ACTIVE,
        ]);
        $venue = $this->venue($owner);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/reservations', [
                'venue_id' => $venue->id,
                'party_size' => 2,
                'reservation_date' => now()->addDay()->format('Y-m-d'),
                'reservation_time' => '19:30',
            ])
            ->assertForbidden()
            ->assertJsonPath('message', 'Please verify your email address before creating a reservation.');

        $this->assertDatabaseMissing('reservations', [
            'venue_id' => $venue->id,
            'user_id' => $user->id,
        ]);
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

    public function test_user_can_cancel_own_future_pending_or_confirmed_reservation_with_reason(): void
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
            ->patchJson("/api/reservations/{$confirmed->id}/cancel", [
                'cancellation_reason' => 'Change of plans',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', Reservation::STATUS_CANCELLED)
            ->assertJsonPath('data.cancellation_reason', 'Change of plans');

        $this->assertDatabaseHas('reservations', [
            'id' => $confirmed->id,
            'status' => Reservation::STATUS_CANCELLED,
            'cancellation_reason' => 'Change of plans',
        ]);
        $this->assertNotNull($confirmed->fresh()->cancelled_at);

        $this->actingAs($user, 'sanctum')
            ->patchJson("/api/reservations/{$pending->id}/cancel")
            ->assertOk()
            ->assertJsonPath('data.status', Reservation::STATUS_CANCELLED);

        $this->assertDatabaseHas('reservations', [
            'id' => $pending->id,
            'status' => Reservation::STATUS_CANCELLED,
        ]);
        Mail::assertSent(ReservationCancelledMail::class, fn ($mail) => $mail->hasTo($user->email));
        Mail::assertSent(ReservationCancelledByGuestMail::class, fn ($mail) => $mail->hasTo($owner->email));
    }

    public function test_user_cannot_cancel_past_or_already_cancelled_reservation(): void
    {
        $owner = $this->organizer();
        $user = User::factory()->create(['role' => User::ROLE_USER, 'status' => User::STATUS_ACTIVE]);
        $venue = $this->venue($owner);
        $past = Reservation::query()->create([
            'venue_id' => $venue->id,
            'user_id' => $user->id,
            'guest_name' => $user->name,
            'party_size' => 2,
            'reservation_date' => now()->subDay()->format('Y-m-d'),
            'reservation_time' => '18:00',
            'status' => Reservation::STATUS_CONFIRMED,
        ]);
        $cancelled = Reservation::query()->create([
            'venue_id' => $venue->id,
            'user_id' => $user->id,
            'guest_name' => $user->name,
            'party_size' => 2,
            'reservation_date' => now()->addDay()->format('Y-m-d'),
            'reservation_time' => '19:00',
            'status' => Reservation::STATUS_CANCELLED,
        ]);

        $this->actingAs($user, 'sanctum')
            ->patchJson("/api/reservations/{$past->id}/cancel")
            ->assertUnprocessable()
            ->assertJsonPath('errors.reservation.0', 'This reservation can no longer be cancelled.');

        $this->actingAs($user, 'sanctum')
            ->patchJson("/api/reservations/{$cancelled->id}/cancel")
            ->assertUnprocessable()
            ->assertJsonPath('message', 'This reservation has already been cancelled.');
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
            ->assertJsonPath('errors.party_size.0', 'Minimum guests allowed is 2.');

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/reservations', [
                'venue_id' => $venue->id,
                'party_size' => 7,
                'reservation_date' => now()->addDay()->format('Y-m-d'),
                'reservation_time' => '19:30',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('party_size')
            ->assertJsonPath('errors.party_size.0', 'Maximum guests allowed is 6.');

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

    public function test_reservation_must_be_inside_opening_hours(): void
    {
        $owner = $this->organizer();
        $user = User::factory()->create(['role' => User::ROLE_USER, 'status' => User::STATUS_ACTIVE]);
        $venue = $this->venue($owner);
        $date = $this->futureDateForDay(0);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/reservations', [
                'venue_id' => $venue->id,
                'party_size' => 2,
                'reservation_date' => $date,
                'reservation_time' => '12:00',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', Reservation::STATUS_PENDING);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/reservations', [
                'venue_id' => $venue->id,
                'party_size' => 2,
                'reservation_date' => $date,
                'reservation_time' => '03:00',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('reservation_time')
            ->assertJsonPath('errors.reservation_time.0', 'This venue is closed at the selected time.');
    }

    public function test_reservation_cannot_be_created_on_closed_day(): void
    {
        $owner = $this->organizer();
        $user = User::factory()->create(['role' => User::ROLE_USER, 'status' => User::STATUS_ACTIVE]);
        $venue = $this->venue($owner);
        $sunday = $this->futureDateForDay(6);

        $venue->openingHours()->where('day_of_week', 6)->update([
            'is_closed' => true,
            'opens_at' => null,
            'closes_at' => null,
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/reservations', [
                'venue_id' => $venue->id,
                'party_size' => 2,
                'reservation_date' => $sunday,
                'reservation_time' => '12:00',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('reservation_date')
            ->assertJsonPath('errors.reservation_date.0', 'This venue is closed on the selected day.');
    }

    public function test_blackout_date_blocks_reservations_before_capacity_or_hours(): void
    {
        $owner = $this->organizer();
        $user = User::factory()->create(['role' => User::ROLE_USER, 'status' => User::STATUS_ACTIVE]);
        $venue = $this->venue($owner, ['max_reservations_per_slot' => 100]);
        $date = now()->addDay()->format('Y-m-d');

        VenueBlackoutDate::query()->create([
            'venue_id' => $venue->id,
            'date' => $date,
            'reason' => 'Private Event',
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/reservations', [
                'venue_id' => $venue->id,
                'party_size' => 2,
                'reservation_date' => $date,
                'reservation_time' => '19:30',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('reservation_date')
            ->assertJsonPath('errors.reservation_date.0', 'This restaurant or bar is not accepting reservations on this date.');

        $this->assertDatabaseMissing('reservations', [
            'venue_id' => $venue->id,
            'reservation_date' => $date,
            'reservation_time' => '19:30',
        ]);
    }

    public function test_special_hours_override_normal_opening_hours(): void
    {
        Mail::fake();

        $owner = $this->organizer();
        $user = User::factory()->create(['role' => User::ROLE_USER, 'status' => User::STATUS_ACTIVE]);
        $venue = $this->venue($owner);
        $date = $this->futureDateForDay(0);

        VenueSpecialHour::query()->create([
            'venue_id' => $venue->id,
            'date' => $date,
            'opens_at' => '18:00',
            'closes_at' => '02:00',
            'is_closed' => false,
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/reservations', [
                'venue_id' => $venue->id,
                'party_size' => 2,
                'reservation_date' => $date,
                'reservation_time' => '17:30',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('reservation_time')
            ->assertJsonPath('errors.reservation_time.0', 'This venue is closed at the selected time.');

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/reservations', [
                'venue_id' => $venue->id,
                'party_size' => 2,
                'reservation_date' => $date,
                'reservation_time' => '23:30',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', Reservation::STATUS_PENDING);
    }

    public function test_special_closed_day_blocks_reservations(): void
    {
        $owner = $this->organizer();
        $user = User::factory()->create(['role' => User::ROLE_USER, 'status' => User::STATUS_ACTIVE]);
        $venue = $this->venue($owner);
        $date = now()->addDay()->format('Y-m-d');

        VenueSpecialHour::query()->create([
            'venue_id' => $venue->id,
            'date' => $date,
            'is_closed' => true,
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/reservations', [
                'venue_id' => $venue->id,
                'party_size' => 2,
                'reservation_date' => $date,
                'reservation_time' => '19:30',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('reservation_date')
            ->assertJsonPath('errors.reservation_date.0', 'This venue is closed on the selected day.');
    }

    public function test_reservation_time_must_match_valid_slot(): void
    {
        $owner = $this->organizer();
        $user = User::factory()->create(['role' => User::ROLE_USER, 'status' => User::STATUS_ACTIVE]);
        $venue = $this->venue($owner);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/reservations', [
                'venue_id' => $venue->id,
                'party_size' => 2,
                'reservation_date' => now()->addDay()->format('Y-m-d'),
                'reservation_time' => '08:07',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('reservation_time')
            ->assertJsonPath('errors.reservation_time.0', 'Please select a valid reservation time.');
    }

    public function test_reservation_validation_uses_opening_anchored_slots(): void
    {
        Mail::fake();

        $owner = $this->organizer(['email' => 'owner-anchored@example.test']);
        $user = User::factory()->create([
            'name' => 'Anchored Guest',
            'email' => 'anchored@example.test',
            'role' => User::ROLE_USER,
            'status' => User::STATUS_ACTIVE,
        ]);
        $venue = $this->venue($owner, ['reservation_interval_minutes' => 45]);
        $date = now()->addDay()->format('Y-m-d');

        VenueSpecialHour::query()->create([
            'venue_id' => $venue->id,
            'date' => $date,
            'opens_at' => '07:20:00',
            'closes_at' => '10:00:00',
            'is_closed' => false,
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/reservations', [
                'venue_id' => $venue->id,
                'party_size' => 2,
                'reservation_date' => $date,
                'reservation_time' => '08:05',
            ])
            ->assertOk()
            ->assertJsonPath('data.reservation_time', '08:05');

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/reservations', [
                'venue_id' => $venue->id,
                'party_size' => 2,
                'reservation_date' => $date,
                'reservation_time' => '08:00',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('reservation_time')
            ->assertJsonPath('errors.reservation_time.0', 'Please select a valid reservation time.');
    }

    public function test_reservation_date_must_be_inside_booking_horizon(): void
    {
        $owner = $this->organizer();
        $user = User::factory()->create(['role' => User::ROLE_USER, 'status' => User::STATUS_ACTIVE]);
        $venue = $this->venue($owner, ['booking_horizon_days' => 7]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/reservations', [
                'venue_id' => $venue->id,
                'party_size' => 2,
                'reservation_date' => now()->addDays(8)->format('Y-m-d'),
                'reservation_time' => '08:00',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('reservation_date')
            ->assertJsonPath('errors.reservation_date.0', 'Reservations may only be made up to 7 days in advance.');
    }

    public function test_reservation_slot_limit_rejects_full_time_slot(): void
    {
        Mail::fake();

        $owner = $this->organizer();
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN, 'status' => User::STATUS_ACTIVE]);
        $firstUser = User::factory()->create(['role' => User::ROLE_USER, 'status' => User::STATUS_ACTIVE]);
        $secondUser = User::factory()->create(['role' => User::ROLE_USER, 'status' => User::STATUS_ACTIVE]);
        $venue = $this->venue($owner, ['max_reservations_per_slot' => 1]);
        $date = now()->addDay()->format('Y-m-d');

        $this->actingAs($firstUser, 'sanctum')
            ->postJson('/api/reservations', [
                'venue_id' => $venue->id,
                'party_size' => 2,
                'reservation_date' => $date,
                'reservation_time' => '19:30',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', Reservation::STATUS_PENDING);

        $this->actingAs($secondUser, 'sanctum')
            ->postJson('/api/reservations', [
                'venue_id' => $venue->id,
                'party_size' => 2,
                'reservation_date' => $date,
                'reservation_time' => '19:30',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('reservation_time')
            ->assertJsonPath('errors.reservation_time.0', ReservationCreationService::SLOT_FULL_MESSAGE);

        $this->assertSame(1, Reservation::query()
            ->where('venue_id', $venue->id)
            ->whereDate('reservation_date', $date)
            ->where('reservation_time', '19:30')
            ->count());
        Mail::assertSent(ReservationRequestReceivedMail::class, 1);
        Mail::assertSent(NewReservationReceivedMail::class, 1);
        $this->assertSame(2, Notification::query()->count());

        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/owner/analytics?start_date='.$date.'&end_date='.$date.'&venue_id='.$venue->id)
            ->assertOk()
            ->assertJsonPath('data.overview.total', 1);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/reservations?venue_id='.$venue->id.'&date_from='.$date.'&date_to='.$date)
            ->assertOk()
            ->assertJsonPath('meta.stats.total', 1)
            ->assertJsonCount(1, 'data');
    }

    public function test_final_available_slot_can_be_reserved_atomically(): void
    {
        Mail::fake();

        $owner = $this->organizer();
        $firstUser = User::factory()->create(['role' => User::ROLE_USER, 'status' => User::STATUS_ACTIVE]);
        $secondUser = User::factory()->create(['role' => User::ROLE_USER, 'status' => User::STATUS_ACTIVE]);
        $venue = $this->venue($owner, ['max_reservations_per_slot' => 2]);
        $date = now()->addDay()->format('Y-m-d');

        Reservation::query()->create([
            'venue_id' => $venue->id,
            'user_id' => $firstUser->id,
            'guest_name' => $firstUser->name,
            'party_size' => 2,
            'reservation_date' => $date,
            'reservation_time' => '19:30',
            'status' => Reservation::STATUS_PENDING,
        ]);

        $this->actingAs($secondUser, 'sanctum')
            ->postJson('/api/reservations', [
                'venue_id' => $venue->id,
                'party_size' => 2,
                'reservation_date' => $date,
                'reservation_time' => '19:30',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', Reservation::STATUS_PENDING);

        $this->assertSame(2, Reservation::query()
            ->where('venue_id', $venue->id)
            ->whereDate('reservation_date', $date)
            ->where('reservation_time', '19:30')
            ->count());
        Mail::assertSent(ReservationRequestReceivedMail::class, 1);
        Mail::assertSent(NewReservationReceivedMail::class, 1);
    }

    public function test_atomic_creation_rechecks_capacity_after_stale_precheck(): void
    {
        $owner = $this->organizer();
        $firstUser = User::factory()->create(['role' => User::ROLE_USER, 'status' => User::STATUS_ACTIVE]);
        $secondUser = User::factory()->create(['role' => User::ROLE_USER, 'status' => User::STATUS_ACTIVE]);
        $thirdUser = User::factory()->create(['role' => User::ROLE_USER, 'status' => User::STATUS_ACTIVE]);
        $venue = $this->venue($owner, ['max_reservations_per_slot' => 2]);
        $date = now()->addDay()->format('Y-m-d');

        Reservation::query()->create([
            'venue_id' => $venue->id,
            'user_id' => $firstUser->id,
            'guest_name' => $firstUser->name,
            'party_size' => 2,
            'reservation_date' => $date,
            'reservation_time' => '19:30',
            'status' => Reservation::STATUS_PENDING,
        ]);

        $this->assertFalse(app(\App\Services\Reservations\ReservationAvailabilityService::class)->slotIsFull($venue, $date, '19:30'));

        Reservation::query()->create([
            'venue_id' => $venue->id,
            'user_id' => $secondUser->id,
            'guest_name' => $secondUser->name,
            'party_size' => 2,
            'reservation_date' => $date,
            'reservation_time' => '19:30',
            'status' => Reservation::STATUS_PENDING,
        ]);

        try {
            app(ReservationCreationService::class)->create($thirdUser, [
                'venue_id' => $venue->id,
                'party_size' => 2,
                'reservation_date' => $date,
                'reservation_time' => '19:30',
                'phone' => null,
                'notes' => null,
            ]);

            $this->fail('The stale reservation request was not rejected.');
        } catch (ValidationException $exception) {
            $this->assertSame(
                ReservationCreationService::SLOT_FULL_MESSAGE,
                $exception->errors()['reservation_time'][0] ?? null,
            );
        }

        $this->assertSame(2, Reservation::query()
            ->where('venue_id', $venue->id)
            ->whereDate('reservation_date', $date)
            ->where('reservation_time', '19:30')
            ->count());
    }

    public function test_cancelled_reservations_do_not_count_against_slot_limit(): void
    {
        Mail::fake();

        $owner = $this->organizer();
        $user = User::factory()->create(['role' => User::ROLE_USER, 'status' => User::STATUS_ACTIVE]);
        $venue = $this->venue($owner, ['max_reservations_per_slot' => 1]);
        $date = now()->addDay()->format('Y-m-d');

        Reservation::query()->create([
            'venue_id' => $venue->id,
            'user_id' => $user->id,
            'guest_name' => $user->name,
            'party_size' => 2,
            'reservation_date' => $date,
            'reservation_time' => '20:00',
            'status' => Reservation::STATUS_CANCELLED,
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/reservations', [
                'venue_id' => $venue->id,
                'party_size' => 2,
                'reservation_date' => $date,
                'reservation_time' => '20:00',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', Reservation::STATUS_PENDING);
    }

    public function test_inactive_venue_cannot_be_reserved(): void
    {
        $owner = $this->organizer();
        $user = User::factory()->create(['role' => User::ROLE_USER, 'status' => User::STATUS_ACTIVE]);
        $venue = $this->venue($owner, ['status' => Venue::STATUS_INACTIVE]);

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
            ->patchJson("/api/owner/reservations/{$reservation->id}/cancel", [
                'owner_cancellation_reason' => 'Maintenance',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', Reservation::STATUS_CANCELLED)
            ->assertJsonPath('data.owner_cancellation_reason', 'Maintenance');

        Reservation::query()->whereKey($reservation->id)->update([
            'status' => Reservation::STATUS_CONFIRMED,
            'cancelled_at' => null,
            'owner_cancellation_reason' => null,
        ]);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/owner/reservations/{$reservation->id}/cancel", [
                'owner_cancellation_reason' => 'Staff shortage',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', Reservation::STATUS_CANCELLED)
            ->assertJsonPath('data.owner_cancellation_reason', 'Staff shortage');
    }

    private function organizer(array $attributes = []): User
    {
        return User::factory()->create(array_merge([
            'role' => User::ROLE_OWNER,
            'status' => User::STATUS_ACTIVE,
            'organizer_status' => User::ORGANIZER_STATUS_NONE,
        ], $attributes));
    }

    private function venue(User $owner, array $attributes = []): Venue
    {
        $venue = Venue::query()->create(array_merge([
            'user_id' => $owner->id,
            'name' => 'Reservation Room',
            'slug' => 'reservation-room-'.uniqid(),
            'venue_type' => Venue::TYPE_RESTAURANT,
            'city' => 'Pristina',
            'status' => Venue::STATUS_ACTIVE,
            'min_guests' => 1,
            'max_guests' => 8,
        ], $attributes));

        foreach (range(0, 6) as $day) {
            $venue->openingHours()->create([
                'day_of_week' => $day,
                'opens_at' => '08:00',
                'closes_at' => '22:00',
                'is_closed' => false,
            ]);
        }

        return $venue;
    }

    private function futureDateForDay(int $dayOfWeek): string
    {
        $date = now()->addDay()->startOfDay();

        while (($date->dayOfWeekIso - 1) !== $dayOfWeek) {
            $date->addDay();
        }

        return $date->format('Y-m-d');
    }
}
