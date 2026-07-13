<?php

namespace Tests\Feature\Notifications;

use App\Mail\NewReservationReceivedMail;
use App\Mail\ReservationCancelledByGuestMail;
use App\Mail\ReservationCancelledMail;
use App\Mail\ReservationConfirmedMail;
use App\Mail\ReservationRequestReceivedMail;
use App\Models\Notification;
use App\Models\Reservation;
use App\Models\User;
use App\Models\Venue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class NotificationCenterTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_list_count_and_mark_only_own_notifications(): void
    {
        $user = User::factory()->create(['role' => User::ROLE_USER, 'status' => User::STATUS_ACTIVE]);
        $other = User::factory()->create(['role' => User::ROLE_USER, 'status' => User::STATUS_ACTIVE]);
        $mine = Notification::query()->create([
            'user_id' => $user->id,
            'type' => Notification::TYPE_RESERVATION_CREATED,
            'title' => 'Reservation Request Created',
            'message' => 'Your reservation request was created.',
            'link' => '/site/my-reservations.html',
        ]);
        $otherNotification = Notification::query()->create([
            'user_id' => $other->id,
            'type' => Notification::TYPE_RESERVATION_CREATED,
            'title' => 'Other Notification',
            'message' => 'This belongs to another user.',
        ]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $mine->id);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/notifications/unread-count')
            ->assertOk()
            ->assertJsonPath('data.count', 1);

        $this->actingAs($user, 'sanctum')
            ->patchJson("/api/notifications/{$otherNotification->id}/read")
            ->assertForbidden();

        $this->actingAs($user, 'sanctum')
            ->patchJson("/api/notifications/{$mine->id}/read")
            ->assertOk()
            ->assertJsonPath('data.is_read', true);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/notifications/unread-count')
            ->assertOk()
            ->assertJsonPath('data.count', 0);
    }

    public function test_mark_all_read_only_updates_authenticated_users_notifications(): void
    {
        $user = User::factory()->create(['role' => User::ROLE_USER, 'status' => User::STATUS_ACTIVE]);
        $other = User::factory()->create(['role' => User::ROLE_USER, 'status' => User::STATUS_ACTIVE]);

        Notification::query()->create([
            'user_id' => $user->id,
            'type' => Notification::TYPE_TICKET_PURCHASED,
            'title' => 'Ticket Purchased',
            'message' => 'Your ticket is ready.',
        ]);
        Notification::query()->create([
            'user_id' => $other->id,
            'type' => Notification::TYPE_TICKET_PURCHASED,
            'title' => 'Ticket Purchased',
            'message' => 'Your ticket is ready.',
        ]);

        $this->actingAs($user, 'sanctum')
            ->patchJson('/api/notifications/read-all')
            ->assertOk();

        $this->assertDatabaseHas('notifications', [
            'user_id' => $user->id,
            'is_read' => true,
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $other->id,
            'is_read' => false,
        ]);
    }

    public function test_event_and_reservation_notifications_are_unified_newest_first_with_global_unread_count(): void
    {
        $user = User::factory()->create(['role' => User::ROLE_USER, 'status' => User::STATUS_ACTIVE]);

        $reservation = Notification::query()->create([
            'user_id' => $user->id,
            'type' => Notification::TYPE_RESERVATION_CONFIRMED,
            'title' => 'Reservation Confirmed',
            'message' => 'Your reservation is confirmed.',
            'link' => 'my-reservations.html',
        ]);
        $event = Notification::query()->create([
            'user_id' => $user->id,
            'type' => Notification::TYPE_EVENT_UPDATED,
            'title' => 'Event Updated',
            'message' => '"Unified Event" has been updated.',
            'link' => 'event-details.html?id=123',
        ]);
        $reservation->forceFill([
            'created_at' => now()->subMinutes(5),
            'updated_at' => now()->subMinutes(5),
        ])->save();
        $event->forceFill([
            'created_at' => now(),
            'updated_at' => now(),
        ])->save();

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonPath('data.0.id', $event->id)
            ->assertJsonPath('data.0.type', Notification::TYPE_EVENT_UPDATED)
            ->assertJsonPath('data.1.id', $reservation->id)
            ->assertJsonPath('data.1.type', Notification::TYPE_RESERVATION_CONFIRMED);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/notifications/unread-count')
            ->assertOk()
            ->assertJsonPath('data.count', 2);
    }

    public function test_reservation_flow_creates_in_app_notifications_without_removing_emails(): void
    {
        Mail::fake();

        $owner = $this->organizer(['email' => 'owner-notifications@example.test']);
        $user = User::factory()->create([
            'name' => 'Notification Guest',
            'email' => 'guest-notifications@example.test',
            'role' => User::ROLE_USER,
            'status' => User::STATUS_ACTIVE,
        ]);
        $venue = $this->venue($owner);

        $reservationId = $this->actingAs($user, 'sanctum')
            ->postJson('/api/reservations', [
                'venue_id' => $venue->id,
                'party_size' => 2,
                'reservation_date' => now()->addDay()->format('Y-m-d'),
                'reservation_time' => '19:30',
            ])
            ->assertOk()
            ->json('data.id');

        Mail::assertQueued(ReservationRequestReceivedMail::class, fn ($mail) => $mail->hasTo($user->email));
        Mail::assertQueued(NewReservationReceivedMail::class, fn ($mail) => $mail->hasTo($owner->email));
        $this->assertDatabaseHas('notifications', [
            'user_id' => $user->id,
            'type' => Notification::TYPE_RESERVATION_CREATED,
            'title' => 'Reservation Request Created',
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $owner->id,
            'type' => Notification::TYPE_RESERVATION_CREATED,
            'title' => 'New Reservation',
        ]);

        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/owner/reservations/{$reservationId}/confirm")
            ->assertOk();

        Mail::assertQueued(ReservationConfirmedMail::class, fn ($mail) => $mail->hasTo($user->email));
        $this->assertDatabaseHas('notifications', [
            'user_id' => $user->id,
            'type' => Notification::TYPE_RESERVATION_CONFIRMED,
            'title' => 'Reservation Confirmed',
        ]);

        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/owner/reservations/{$reservationId}/cancel", [
                'owner_cancellation_reason' => 'Schedule changed',
            ])
            ->assertOk();

        Mail::assertQueued(ReservationCancelledMail::class, fn ($mail) => $mail->hasTo($user->email));
        $this->assertDatabaseHas('notifications', [
            'user_id' => $user->id,
            'type' => Notification::TYPE_RESERVATION_CANCELLED,
            'title' => 'Reservation Cancelled',
        ]);
    }

    public function test_user_cancellation_notifies_guest_and_owner(): void
    {
        Mail::fake();

        $owner = $this->organizer(['email' => 'owner-cancelled@example.test']);
        $user = User::factory()->create([
            'name' => 'Cancel Guest',
            'email' => 'cancel-guest@example.test',
            'role' => User::ROLE_USER,
            'status' => User::STATUS_ACTIVE,
        ]);
        $venue = $this->venue($owner);
        $reservation = Reservation::query()->create([
            'venue_id' => $venue->id,
            'user_id' => $user->id,
            'guest_name' => $user->name,
            'party_size' => 2,
            'reservation_date' => now()->addDay()->format('Y-m-d'),
            'reservation_time' => '20:00',
            'status' => Reservation::STATUS_CONFIRMED,
        ]);

        $this->actingAs($user, 'sanctum')
            ->patchJson("/api/reservations/{$reservation->id}/cancel", [
                'cancellation_reason' => 'Plans changed',
            ])
            ->assertOk();

        Mail::assertQueued(ReservationCancelledMail::class, fn ($mail) => $mail->hasTo($user->email));
        Mail::assertQueued(ReservationCancelledByGuestMail::class, fn ($mail) => $mail->hasTo($owner->email));
        $this->assertDatabaseHas('notifications', [
            'user_id' => $user->id,
            'type' => Notification::TYPE_RESERVATION_CANCELLED_BY_USER,
            'title' => 'Reservation Cancelled Successfully',
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $owner->id,
            'type' => Notification::TYPE_RESERVATION_CANCELLED_BY_USER,
            'title' => 'Reservation Cancelled By Guest',
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

    private function venue(User $owner): Venue
    {
        $venue = Venue::query()->create([
            'user_id' => $owner->id,
            'name' => 'Notification Room',
            'slug' => 'notification-room-'.uniqid(),
            'venue_type' => Venue::TYPE_RESTAURANT,
            'city' => 'Pristina',
            'status' => Venue::STATUS_ACTIVE,
            'min_guests' => 1,
            'max_guests' => 8,
        ]);

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
}
