<?php

namespace Tests\Feature\Admin;

use App\Mail\ReservationConfirmedMail;
use App\Listeners\LogOutgoingEmail;
use App\Models\CheckoutReservation;
use App\Models\EmailLog;
use App\Models\Event;
use App\Models\EmailTemplate;
use App\Models\EventCategory;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\PlatformSetting;
use App\Models\Reservation;
use App\Models\Ticket;
use App\Models\TicketType;
use App\Models\User;
use App\Models\Venue;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Mail\Events\MessageSending;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\Mime\Email;
use Tests\TestCase;

class AdminDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_dashboard_includes_checkout_reservation_statistics(): void
    {
        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
            'status' => User::STATUS_ACTIVE,
        ]);

        $user = User::factory()->create([
            'role' => User::ROLE_USER,
            'status' => User::STATUS_ACTIVE,
        ]);

        $organizer = User::factory()->create([
            'role' => User::ROLE_ORGANIZER,
            'status' => User::STATUS_ACTIVE,
            'organizer_status' => User::ORGANIZER_STATUS_APPROVED,
        ]);

        $event = Event::query()->create([
            'organizer_id' => $organizer->id,
            'title' => 'Admin Reservation Stats Event',
            'slug' => 'admin-reservation-stats-event',
            'category' => 'Concerts',
            'venue_name' => 'Tiketa Hall',
            'city' => 'New York',
            'starts_at' => now()->addMonth(),
            'status' => 'published',
            'visibility' => 'public',
            'currency' => 'USD',
        ]);

        $ticketType = TicketType::query()->create([
            'event_id' => $event->id,
            'name' => 'General Admission',
            'price' => 25,
            'currency' => 'USD',
            'quantity_total' => 10,
            'min_per_order' => 1,
            'max_per_order' => 10,
            'status' => TicketType::STATUS_ACTIVE,
        ]);

        foreach ([CheckoutReservation::STATUS_ACTIVE, CheckoutReservation::STATUS_EXPIRED, CheckoutReservation::STATUS_COMPLETED] as $status) {
            CheckoutReservation::query()->create([
                'user_id' => $user->id,
                'event_id' => $event->id,
                'ticket_type_id' => $ticketType->id,
                'quantity' => 1,
                'reserved_at' => now()->subMinute(),
                'expires_at' => $status === CheckoutReservation::STATUS_ACTIVE ? now()->addMinutes(4) : now()->subMinute(),
                'status' => $status,
            ]);
        }

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/dashboard')
            ->assertOk()
            ->assertJsonPath('data.reservations.active', 1)
            ->assertJsonPath('data.reservations.expired', 1)
            ->assertJsonPath('data.reservations.completed', 1)
            ->assertJsonPath('data.reservations.total_venues', 0)
            ->assertJsonPath('data.reservations.total_reservations', 0);
    }

    public function test_admin_can_manage_reservation_module_venues(): void
    {
        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
            'status' => User::STATUS_ACTIVE,
        ]);
        $owner = User::factory()->create([
            'name' => 'Venue Owner',
            'role' => User::ROLE_ORGANIZER,
            'status' => User::STATUS_ACTIVE,
            'organizer_status' => User::ORGANIZER_STATUS_APPROVED,
        ]);
        $guest = User::factory()->create(['role' => User::ROLE_USER, 'status' => User::STATUS_ACTIVE]);
        $venue = Venue::query()->create([
            'user_id' => $owner->id,
            'name' => 'Skyline Lounge',
            'slug' => 'skyline-lounge',
            'venue_type' => Venue::TYPE_LOUNGE,
            'city' => 'Chicago',
            'status' => Venue::STATUS_ACTIVE,
        ]);
        Reservation::query()->create([
            'venue_id' => $venue->id,
            'user_id' => $guest->id,
            'guest_name' => 'Dinner Guest',
            'party_size' => 4,
            'reservation_date' => now()->addDay()->toDateString(),
            'reservation_time' => '19:30',
            'status' => Reservation::STATUS_PENDING,
        ]);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/venues?venue_type=lounge&status=active&city=Chic&owner=Venue&search=ignored&q=Skyline')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Skyline Lounge')
            ->assertJsonPath('data.0.owner.email', $owner->email)
            ->assertJsonPath('data.0.reservations_count', 1);

        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/venues/{$venue->slug}")
            ->assertOk()
            ->assertJsonPath('data.reservation_settings.min_guests', 1)
            ->assertJsonPath('data.owner.email', $owner->email);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/venues/{$venue->slug}", [
                'name' => 'Skyline Lounge Updated',
                'city' => 'Evanston',
                'status' => Venue::STATUS_INACTIVE,
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Skyline Lounge Updated')
            ->assertJsonPath('data.city', 'Evanston')
            ->assertJsonPath('data.status', Venue::STATUS_INACTIVE);

        $venue->refresh();

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/venues/{$venue->slug}/activate")
            ->assertOk()
            ->assertJsonPath('data.status', Venue::STATUS_ACTIVE);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/venues/{$venue->fresh()->slug}/deactivate")
            ->assertOk()
            ->assertJsonPath('data.status', Venue::STATUS_INACTIVE);

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/admin/venues/{$venue->fresh()->slug}")
            ->assertOk()
            ->assertJsonPath('message', 'Venue deactivated.');

        $this->assertDatabaseHas('venues', [
            'id' => $venue->id,
            'status' => Venue::STATUS_INACTIVE,
        ]);
    }

    public function test_admin_can_manage_reservations_without_owner_scope(): void
    {
        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
            'status' => User::STATUS_ACTIVE,
        ]);
        $owner = User::factory()->create([
            'name' => 'Reservation Owner',
            'role' => User::ROLE_ORGANIZER,
            'status' => User::STATUS_ACTIVE,
            'organizer_status' => User::ORGANIZER_STATUS_APPROVED,
        ]);
        $guest = User::factory()->create([
            'name' => 'Reservation Guest',
            'email' => 'reservation-guest@example.test',
            'role' => User::ROLE_USER,
            'status' => User::STATUS_ACTIVE,
        ]);
        $venue = Venue::query()->create([
            'user_id' => $owner->id,
            'name' => 'Harbor Restaurant',
            'slug' => 'harbor-restaurant',
            'venue_type' => Venue::TYPE_RESTAURANT,
            'city' => 'Boston',
            'status' => Venue::STATUS_ACTIVE,
        ]);
        $reservationDate = today()->addMonth()->startOfMonth()->addDay()->toDateString();
        $reservation = Reservation::query()->create([
            'venue_id' => $venue->id,
            'user_id' => $guest->id,
            'guest_name' => 'Reservation Guest',
            'phone' => '555-0100',
            'party_size' => 2,
            'reservation_date' => $reservationDate,
            'reservation_time' => '18:00',
            'status' => Reservation::STATUS_PENDING,
            'notes' => 'Window table',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/reservations?status=pending&venue_id={$venue->id}&owner_id={$owner->id}&city=Bos&date_from={$reservationDate}&date_to={$reservationDate}&q={$reservation->id}")
            ->assertOk()
            ->assertJsonPath('meta.stats.total', 1)
            ->assertJsonPath('meta.stats.pending', 1)
            ->assertJsonPath('meta.platform.this_month', 0)
            ->assertJsonPath('data.0.guest_name', 'Reservation Guest')
            ->assertJsonPath('data.0.venue.owner.email', $owner->email);

        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/reservations/{$reservation->id}")
            ->assertOk()
            ->assertJsonPath('data.notes', 'Window table')
            ->assertJsonPath('data.email_history', [])
            ->assertJsonPath('data.audit_history.0.label', 'Reservation Created')
            ->assertJsonPath('data.audit_history.0.actor', 'Reservation Guest');

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/reservations/{$reservation->id}/confirm")
            ->assertOk()
            ->assertJsonPath('data.status', Reservation::STATUS_CONFIRMED);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/reservations/{$reservation->id}/cancel", ['cancellation_reason' => 'Closed for maintenance'])
            ->assertOk()
            ->assertJsonPath('data.status', Reservation::STATUS_CANCELLED)
            ->assertJsonPath('data.cancellation_reason', 'Closed for maintenance');

        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/reservations/{$reservation->id}")
            ->assertOk()
            ->assertJsonPath('data.audit_history.1.label', 'Confirmed by Admin')
            ->assertJsonPath('data.audit_history.1.actor', $admin->name)
            ->assertJsonPath('data.audit_history.2.label', 'Cancelled by Admin');

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/admin/reservations/{$reservation->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Reservation archived.');

        $this->assertSoftDeleted('reservations', ['id' => $reservation->id]);
    }

    public function test_admin_can_complete_and_mark_no_show_with_owner_transition_rules(): void
    {
        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
            'status' => User::STATUS_ACTIVE,
        ]);
        $owner = User::factory()->create([
            'role' => User::ROLE_ORGANIZER,
            'status' => User::STATUS_ACTIVE,
            'organizer_status' => User::ORGANIZER_STATUS_APPROVED,
        ]);
        $guest = User::factory()->create(['role' => User::ROLE_USER, 'status' => User::STATUS_ACTIVE]);
        $venue = Venue::query()->create([
            'user_id' => $owner->id,
            'name' => 'Admin Lifecycle Venue',
            'slug' => 'admin-lifecycle-venue',
            'venue_type' => Venue::TYPE_RESTAURANT,
            'city' => 'Boston',
            'status' => Venue::STATUS_ACTIVE,
        ]);
        $pending = Reservation::query()->create([
            'venue_id' => $venue->id,
            'user_id' => $guest->id,
            'guest_name' => 'Pending Guest',
            'party_size' => 2,
            'reservation_date' => '2026-07-02',
            'reservation_time' => '18:00',
            'status' => Reservation::STATUS_PENDING,
        ]);
        $toComplete = Reservation::query()->create([
            'venue_id' => $venue->id,
            'user_id' => $guest->id,
            'guest_name' => 'Complete Guest',
            'party_size' => 2,
            'reservation_date' => '2026-07-02',
            'reservation_time' => '19:00',
            'status' => Reservation::STATUS_CONFIRMED,
        ]);
        $toNoShow = Reservation::query()->create([
            'venue_id' => $venue->id,
            'user_id' => $guest->id,
            'guest_name' => 'No Show Guest',
            'party_size' => 2,
            'reservation_date' => '2026-07-02',
            'reservation_time' => '20:00',
            'status' => Reservation::STATUS_CONFIRMED,
        ]);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/reservations/{$pending->id}/complete")
            ->assertUnprocessable();

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/reservations/{$pending->id}/no-show")
            ->assertUnprocessable();

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/reservations/{$toComplete->id}/complete")
            ->assertOk()
            ->assertJsonPath('data.status', Reservation::STATUS_COMPLETED);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/reservations/{$toNoShow->id}/no-show")
            ->assertOk()
            ->assertJsonPath('data.status', Reservation::STATUS_NO_SHOW);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $admin->id,
            'action' => 'reservation.completed',
            'auditable_id' => $toComplete->id,
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $admin->id,
            'action' => 'reservation.no_show',
            'auditable_id' => $toNoShow->id,
        ]);
    }

    public function test_non_admin_cannot_access_admin_reservation_module(): void
    {
        $user = User::factory()->create([
            'role' => User::ROLE_USER,
            'status' => User::STATUS_ACTIVE,
        ]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/admin/venues')
            ->assertForbidden();

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/admin/reservations')
            ->assertForbidden();

        $reservation = Reservation::query()->create([
            'venue_id' => Venue::query()->create([
                'user_id' => User::factory()->create([
                    'role' => User::ROLE_ORGANIZER,
                    'status' => User::STATUS_ACTIVE,
                    'organizer_status' => User::ORGANIZER_STATUS_APPROVED,
                ])->id,
                'name' => 'Forbidden Reservation Venue',
                'slug' => 'forbidden-reservation-venue',
                'venue_type' => Venue::TYPE_RESTAURANT,
                'city' => 'Boston',
            ])->id,
            'user_id' => $user->id,
            'guest_name' => 'Forbidden Guest',
            'party_size' => 2,
            'reservation_date' => '2026-07-02',
            'reservation_time' => '18:00',
            'status' => Reservation::STATUS_CONFIRMED,
        ]);

        $this->actingAs($user, 'sanctum')
            ->patchJson("/api/admin/reservations/{$reservation->id}/no-show")
            ->assertForbidden();
    }

    public function test_admin_can_filter_users_change_roles_and_approve_organizers(): void
    {
        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
            'status' => User::STATUS_ACTIVE,
        ]);

        $user = User::factory()->create([
            'name' => 'Pending Organizer',
            'email' => 'pending-organizer@example.test',
            'role' => User::ROLE_USER,
            'status' => User::STATUS_ACTIVE,
            'organizer_status' => User::ORGANIZER_STATUS_PENDING,
        ]);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/users?q=pending&organizer_status=pending')
            ->assertOk()
            ->assertJsonPath('data.0.email', 'pending-organizer@example.test');

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/users/{$user->id}/role", ['role' => User::ROLE_ORGANIZER])
            ->assertOk()
            ->assertJsonPath('data.role', User::ROLE_ORGANIZER);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/users/{$user->id}/role", ['role' => User::ROLE_OWNER])
            ->assertOk()
            ->assertJsonPath('data.role', User::ROLE_OWNER)
            ->assertJsonPath('data.organizer_status', User::ORGANIZER_STATUS_NONE);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/users?role=owner')
            ->assertOk()
            ->assertJsonPath('data.0.email', 'pending-organizer@example.test');

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/users/{$user->id}/approve-organizer")
            ->assertOk()
            ->assertJsonPath('data.organizer_status', User::ORGANIZER_STATUS_APPROVED);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/users/{$admin->id}/role", ['role' => User::ROLE_USER])
            ->assertUnprocessable();
    }

    public function test_admin_can_view_suspend_and_reactivate_users(): void
    {
        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
            'status' => User::STATUS_ACTIVE,
        ]);

        $user = User::factory()->create([
            'role' => User::ROLE_USER,
            'status' => User::STATUS_ACTIVE,
        ]);

        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/users/{$user->id}")
            ->assertOk()
            ->assertJsonPath('data.email', $user->email)
            ->assertJsonStructure(['data' => ['orders_count', 'organized_events_count', 'tickets_count']]);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/users/{$user->id}/suspend")
            ->assertOk()
            ->assertJsonPath('data.status', User::STATUS_SUSPENDED);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/users/{$user->id}/reactivate")
            ->assertOk()
            ->assertJsonPath('data.status', User::STATUS_ACTIVE);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/users/{$admin->id}/suspend")
            ->assertUnprocessable();
    }

    public function test_admin_can_filter_and_sort_users_by_email_verification(): void
    {
        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
            'status' => User::STATUS_ACTIVE,
        ]);

        $verified = User::factory()->create([
            'name' => 'Verified Buyer',
            'email' => 'verified-buyer@example.test',
            'role' => User::ROLE_USER,
            'status' => User::STATUS_ACTIVE,
            'email_verified_at' => now()->subDay(),
        ]);

        $newerVerified = User::factory()->create([
            'name' => 'Recently Verified Buyer',
            'email' => 'recently-verified@example.test',
            'role' => User::ROLE_USER,
            'status' => User::STATUS_ACTIVE,
            'email_verified_at' => now(),
        ]);

        $unverified = User::factory()->unverified()->create([
            'name' => 'Unverified Buyer',
            'email' => 'unverified-buyer@example.test',
            'role' => User::ROLE_USER,
            'status' => User::STATUS_ACTIVE,
        ]);

        $verifiedResponse = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/users?role=user&email_verification=verified&sort=-email_verified_at')
            ->assertOk();

        $verifiedEmails = collect($verifiedResponse->json('data'))->pluck('email');

        $this->assertTrue($verifiedEmails->contains($newerVerified->email));
        $this->assertTrue($verifiedEmails->contains($verified->email));
        $this->assertFalse($verifiedEmails->contains($unverified->email));
        $this->assertSame($newerVerified->email, $verifiedEmails->first());

        $unverifiedResponse = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/users?role=user&email_verification=unverified&sort=-verification_status')
            ->assertOk();

        $unverifiedEmails = collect($unverifiedResponse->json('data'))->pluck('email');

        $this->assertTrue($unverifiedEmails->contains($unverified->email));
        $this->assertFalse($unverifiedEmails->contains($verified->email));
        $this->assertFalse($unverifiedEmails->contains($newerVerified->email));
    }

    public function test_admin_can_unpublish_events_and_store_moderation_notes(): void
    {
        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
            'status' => User::STATUS_ACTIVE,
        ]);

        $organizer = User::factory()->create([
            'role' => User::ROLE_ORGANIZER,
            'status' => User::STATUS_ACTIVE,
            'organizer_status' => User::ORGANIZER_STATUS_APPROVED,
        ]);

        $event = Event::query()->create([
            'organizer_id' => $organizer->id,
            'title' => 'Moderated Event',
            'slug' => 'moderated-event',
            'category' => 'Concerts',
            'venue_name' => 'Tiketa Hall',
            'city' => 'New York',
            'starts_at' => now()->addMonth(),
            'status' => 'published',
            'visibility' => 'public',
            'currency' => 'USD',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/events/{$event->id}/unpublish", ['reason' => 'Needs updated venue details.'])
            ->assertOk()
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.moderation_notes', 'Needs updated venue details.');

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/events/{$event->id}/reject", ['reason' => 'Policy issue.'])
            ->assertOk()
            ->assertJsonPath('data.status', 'rejected')
            ->assertJsonPath('data.moderation_notes', 'Policy issue.');
    }

    public function test_admin_event_index_includes_ticket_sales_inventory_totals(): void
    {
        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
            'status' => User::STATUS_ACTIVE,
        ]);

        $organizer = User::factory()->create([
            'role' => User::ROLE_ORGANIZER,
            'status' => User::STATUS_ACTIVE,
            'organizer_status' => User::ORGANIZER_STATUS_APPROVED,
        ]);

        $event = Event::query()->create([
            'organizer_id' => $organizer->id,
            'title' => 'Inventory Totals Event',
            'slug' => 'inventory-totals-event',
            'category' => 'Concerts',
            'venue_name' => 'Tiketa Hall',
            'city' => 'New York',
            'starts_at' => now()->addMonth(),
            'status' => 'published',
            'visibility' => 'public',
            'currency' => 'USD',
        ]);

        TicketType::query()->create([
            'event_id' => $event->id,
            'name' => 'General Admission',
            'price' => 25,
            'currency' => 'USD',
            'quantity_total' => 100,
            'quantity_sold' => 3,
            'quantity_reserved' => 2,
            'min_per_order' => 1,
            'max_per_order' => 10,
            'status' => TicketType::STATUS_ACTIVE,
        ]);

        TicketType::query()->create([
            'event_id' => $event->id,
            'name' => 'VIP',
            'price' => 75,
            'currency' => 'USD',
            'quantity_total' => 150,
            'quantity_sold' => 54,
            'quantity_reserved' => 0,
            'min_per_order' => 1,
            'max_per_order' => 10,
            'status' => TicketType::STATUS_ACTIVE,
        ]);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/events?q=Inventory%20Totals')
            ->assertOk()
            ->assertJsonPath('data.0.id', $event->id)
            ->assertJsonPath('data.0.sold_tickets', 57)
            ->assertJsonPath('data.0.total_inventory', 250)
            ->assertJsonPath('data.0.available_inventory', 191);
    }

    public function test_admin_event_index_includes_computed_event_state_from_status_date_and_inventory(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-03 12:00:00', 'UTC'));

        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
            'status' => User::STATUS_ACTIVE,
        ]);

        $organizer = User::factory()->create([
            'role' => User::ROLE_ORGANIZER,
            'status' => User::STATUS_ACTIVE,
            'organizer_status' => User::ORGANIZER_STATUS_APPROVED,
        ]);

        $draft = $this->createAdminEventWithInventory($organizer, 'Admin Draft State Event', 'admin-draft-state-event', 'draft', now()->addMonth(), null, 100, 0);
        $ended = $this->createAdminEventWithInventory($organizer, 'Admin Ended State Event', 'admin-ended-state-event', 'published', now()->subDay(), now()->subMinute(), 100, 0);
        $soldOut = $this->createAdminEventWithInventory($organizer, 'Admin Sold Out State Event', 'admin-sold-out-state-event', 'published', now()->addMonth(), now()->addMonth()->addHours(3), 100, 100);
        $upcoming = $this->createAdminEventWithInventory($organizer, 'Admin Upcoming State Event', 'admin-upcoming-state-event', 'published', now()->addMonth(), now()->addMonth()->addHours(3), 100, 25);
        $live = $this->createAdminEventWithInventory($organizer, 'Admin Live State Event', 'admin-live-state-event', 'published', now()->subHour(), now()->addHour(), 100, 25);
        $liveWithoutEnd = $this->createAdminEventWithInventory($organizer, 'Admin Live No End State Event', 'admin-live-no-end-state-event', 'published', now()->subDay(), null, 100, 25);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/events?per_page=10')
            ->assertOk();

        $events = collect($response->json('data'))->keyBy('slug');

        $this->assertSame('draft', $events[$draft->slug]['event_state']['key']);
        $this->assertSame('ended', $events[$ended->slug]['event_state']['key']);
        $this->assertSame('sold_out', $events[$soldOut->slug]['event_state']['key']);
        $this->assertSame('upcoming', $events[$upcoming->slug]['event_state']['key']);
        $this->assertSame('live', $events[$live->slug]['event_state']['key']);
        $this->assertSame('live', $events[$liveWithoutEnd->slug]['event_state']['key']);
        $this->assertSame(100, $events[$soldOut->slug]['sold_tickets']);
        $this->assertSame(0, $events[$soldOut->slug]['available_inventory']);

        Carbon::setTestNow();
    }

    public function test_admin_can_refund_mock_paid_orders(): void
    {
        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
            'status' => User::STATUS_ACTIVE,
        ]);

        $buyer = User::factory()->create([
            'role' => User::ROLE_USER,
            'status' => User::STATUS_ACTIVE,
        ]);

        $organizer = User::factory()->create([
            'role' => User::ROLE_ORGANIZER,
            'status' => User::STATUS_ACTIVE,
            'organizer_status' => User::ORGANIZER_STATUS_APPROVED,
        ]);

        $event = Event::query()->create([
            'organizer_id' => $organizer->id,
            'title' => 'Admin Refund Event',
            'slug' => 'admin-refund-event',
            'category' => 'Concerts',
            'venue_name' => 'Tiketa Hall',
            'city' => 'New York',
            'starts_at' => now()->addMonth(),
            'status' => 'published',
            'visibility' => 'public',
            'currency' => 'USD',
        ]);

        $ticketType = TicketType::query()->create([
            'event_id' => $event->id,
            'name' => 'General Admission',
            'price' => 25,
            'currency' => 'USD',
            'quantity_total' => 10,
            'quantity_sold' => 1,
            'min_per_order' => 1,
            'max_per_order' => 10,
            'status' => TicketType::STATUS_ACTIVE,
        ]);

        $order = Order::query()->create([
            'user_id' => $buyer->id,
            'order_number' => 'ES-2026-000002',
            'status' => Order::STATUS_PAID,
            'payment_status' => Order::PAYMENT_STATUS_PAID,
            'payment_provider' => 'mock',
            'payment_reference' => 'mock-ES-2026-000002',
            'subtotal' => 25,
            'service_fee' => 1.25,
            'total' => 26.25,
            'currency' => 'USD',
            'billing_email' => $buyer->email,
            'billing_first_name' => 'Refund',
            'billing_last_name' => 'Buyer',
            'paid_at' => now(),
        ]);

        $item = OrderItem::query()->create([
            'order_id' => $order->id,
            'event_id' => $event->id,
            'ticket_type_id' => $ticketType->id,
            'quantity' => 1,
            'unit_price' => 25,
            'service_fee' => 1.25,
            'total' => 26.25,
            'ticket_type_name' => 'General Admission',
            'event_title' => $event->title,
            'event_starts_at' => $event->starts_at,
        ]);

        Ticket::query()->create([
            'ticket_code' => 'ES-TEST-REFUND',
            'qr_token' => 'test-refund-token',
            'qr_payload' => '{}',
            'user_id' => $buyer->id,
            'event_id' => $event->id,
            'ticket_type_id' => $ticketType->id,
            'order_id' => $order->id,
            'order_item_id' => $item->id,
            'status' => Ticket::STATUS_ACTIVE,
        ]);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/payments/{$order->id}/refund", ['reason' => 'requested_by_customer'])
            ->assertOk()
            ->assertJsonPath('data.status', 'succeeded');

        $order->refresh();

        $this->assertSame(Order::STATUS_REFUNDED, $order->status);
        $this->assertSame(Order::PAYMENT_STATUS_REFUNDED, $order->payment_status);
        $this->assertSame(Ticket::STATUS_REFUNDED, $order->tickets()->first()->status);
    }

    public function test_admin_can_update_event_service_fee_percentage(): void
    {
        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
            'status' => User::STATUS_ACTIVE,
        ]);

        $organizer = User::factory()->create([
            'role' => User::ROLE_ORGANIZER,
            'status' => User::STATUS_ACTIVE,
            'organizer_status' => User::ORGANIZER_STATUS_APPROVED,
        ]);

        $event = Event::query()->create([
            'organizer_id' => $organizer->id,
            'title' => 'Fee Controlled Event',
            'slug' => 'fee-controlled-event',
            'category' => 'Concerts',
            'venue_name' => 'Tiketa Hall',
            'city' => 'New York',
            'starts_at' => now()->addMonth(),
            'status' => 'published',
            'visibility' => 'public',
            'currency' => 'USD',
        ]);

        $this->assertEquals(10.0, (float) $event->refresh()->service_fee_percentage);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/events/{$event->id}/service-fee", ['service_fee_percentage' => 12.5])
            ->assertOk()
            ->assertJsonPath('data.service_fee_percentage', '12.50');

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/events/{$event->id}/service-fee", ['service_fee_percentage' => 35])
            ->assertUnprocessable();

        $this->actingAs($organizer, 'sanctum')
            ->patchJson("/api/admin/events/{$event->id}/service-fee", ['service_fee_percentage' => 5])
            ->assertForbidden();
    }

    public function test_admin_can_update_default_service_fee_without_code_changes(): void
    {
        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
            'status' => User::STATUS_ACTIVE,
        ]);

        $organizer = User::factory()->create([
            'role' => User::ROLE_ORGANIZER,
            'status' => User::STATUS_ACTIVE,
            'organizer_status' => User::ORGANIZER_STATUS_APPROVED,
        ]);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/settings')
            ->assertOk()
            ->assertJsonPath('data.default_service_fee_percentage', 10);

        $this->actingAs($admin, 'sanctum')
            ->patchJson('/api/admin/settings', ['default_service_fee_percentage' => 12.75])
            ->assertOk()
            ->assertJsonPath('data.default_service_fee_percentage', 12.75);

        $this->assertSame(12.75, (float) PlatformSetting::getValue('default_service_fee_percentage'));

        $response = $this->actingAs($organizer, 'sanctum')
            ->postJson('/api/organizer/events', [
                'title' => 'Default Fee Event',
                'category' => 'Concerts',
                'venue_name' => 'Tiketa Hall',
                'city' => 'New York',
                'starts_at' => now()->addMonth()->toIso8601String(),
                'status' => 'draft',
                'visibility' => 'public',
                'currency' => 'USD',
            ])
            ->assertCreated();

        $this->assertSame('12.75', Event::findOrFail($response->json('data.id'))->service_fee_percentage);

        $this->actingAs($organizer, 'sanctum')
            ->patchJson('/api/admin/settings', ['default_service_fee_percentage' => 5])
            ->assertForbidden();
    }

    public function test_admin_can_manage_dynamic_categories_for_public_pages(): void
    {
        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
            'status' => User::STATUS_ACTIVE,
        ]);

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/categories', [
                'name' => 'Workshops',
                'icon' => 'bi-tools',
                'sort_order' => 1,
            ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Workshops')
            ->assertJsonPath('data.is_active', true);

        $category = EventCategory::query()->where('name', 'Workshops')->firstOrFail();

        $this->getJson('/api/categories')
            ->assertOk()
            ->assertJsonFragment(['name' => 'Workshops']);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/categories/{$category->id}", [
                'name' => 'Workshops & Classes',
                'is_active' => false,
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Workshops & Classes')
            ->assertJsonPath('data.is_active', false);

        $this->getJson('/api/categories')
            ->assertOk()
            ->assertJsonMissing(['name' => 'Workshops & Classes']);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'category.created',
            'auditable_type' => EventCategory::class,
            'auditable_id' => $category->id,
        ]);
    }

    public function test_admin_can_manage_platform_settings_email_templates_and_view_audit_logs(): void
    {
        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
            'status' => User::STATUS_ACTIVE,
        ]);

        $template = EmailTemplate::query()->where('key', 'order_confirmation')->firstOrFail();

        $this->actingAs($admin, 'sanctum')
            ->patchJson('/api/admin/settings', [
                'platform_name' => 'Tiketa Pro',
                'support_email' => 'help@example.test',
                'default_purchase_limit' => 8,
                'maintenance_mode' => false,
            ])
            ->assertOk()
            ->assertJsonPath('data.platform_name', 'Tiketa Pro')
            ->assertJsonPath('data.default_purchase_limit', 8);

        $this->assertSame('Tiketa Pro', PlatformSetting::getValue('platform_name'));

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/email-templates/{$template->id}", [
                'subject' => 'Tickets for {{ $order->order_number }}',
                'html_template' => '<h1>{{ $platform_name ?? "Tiketa" }}</h1>',
                'text_template' => '{{ $platform_name ?? "Tiketa" }}',
            ])
            ->assertOk()
            ->assertJsonPath('data.subject', 'Tickets for {{ $order->order_number }}');

        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/email-templates/{$template->id}/preview")
            ->assertOk()
            ->assertJsonPath('data.rendered', '<h1>Tiketa</h1>');

        EmailLog::query()->create([
            'recipient_name' => 'Ticket Buyer',
            'recipient_email' => 'buyer@example.test',
            'email_type' => 'Ticket Purchased',
            'module' => EmailLog::MODULE_EVENTS,
            'subject' => 'Your Tiketa tickets',
            'status' => EmailLog::STATUS_SUCCESS,
            'sent_at' => now(),
        ]);

        EmailLog::query()->create([
            'recipient_name' => 'Venue Owner',
            'recipient_email' => 'owner@example.test',
            'email_type' => 'Reservation Confirmed',
            'module' => EmailLog::MODULE_RESERVATIONS,
            'subject' => 'Reservation Confirmed',
            'status' => EmailLog::STATUS_FAILED,
            'sent_at' => null,
        ]);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/email-center?module=Events&status=Success&q=buyer')
            ->assertOk()
            ->assertJsonPath('data.email_logs.0.email_type', 'Ticket Purchased')
            ->assertJsonPath('data.email_logs.0.recipient_email', 'buyer@example.test')
            ->assertJsonPath('data.meta.total', 1)
            ->assertJsonStructure(['data' => ['email_logs', 'meta', 'filters', 'templates']]);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/audit-logs?action=settings.updated')
            ->assertOk();

        $this->assertTrue(collect($response->json('data'))->contains(fn (array $log) => $log['action'] === 'settings.updated'));
        $this->assertDatabaseHas('audit_logs', ['action' => 'email_template.updated']);
    }

    public function test_outgoing_email_attempts_are_logged_for_admin_email_center(): void
    {
        $owner = User::factory()->create([
            'role' => User::ROLE_OWNER,
            'status' => User::STATUS_ACTIVE,
        ]);
        $guest = User::factory()->create([
            'name' => 'Logged Guest',
            'email' => 'logged-guest@example.test',
            'role' => User::ROLE_USER,
            'status' => User::STATUS_ACTIVE,
        ]);
        $venue = Venue::query()->create([
            'user_id' => $owner->id,
            'name' => 'Email Log Bistro',
            'slug' => 'email-log-bistro',
            'venue_type' => Venue::TYPE_RESTAURANT,
            'city' => 'Boston',
            'status' => Venue::STATUS_ACTIVE,
        ]);
        $reservation = Reservation::query()->create([
            'venue_id' => $venue->id,
            'user_id' => $guest->id,
            'guest_name' => 'Logged Guest',
            'party_size' => 2,
            'reservation_date' => now()->addDay()->toDateString(),
            'reservation_time' => '18:00',
            'status' => Reservation::STATUS_CONFIRMED,
        ]);

        Mail::to($guest->email, $guest->name)->send(new ReservationConfirmedMail($reservation));

        $this->assertSame(1, EmailLog::query()
            ->where('recipient_email', 'logged-guest@example.test')
            ->where('subject', 'Reservation Confirmed')
            ->count());

        $this->assertDatabaseHas('email_logs', [
            'recipient_name' => 'Logged Guest',
            'recipient_email' => 'logged-guest@example.test',
            'email_type' => 'Reservation Confirmed',
            'module' => EmailLog::MODULE_RESERVATIONS,
            'subject' => 'Reservation Confirmed',
            'status' => EmailLog::STATUS_SUCCESS,
            'related_user_id' => $guest->id,
            'related_reservation_id' => $reservation->id,
        ]);
    }

    public function test_email_logger_does_not_duplicate_rows_when_mail_event_is_observed_twice(): void
    {
        $message = (new Email)
            ->to('duplicate-check@example.test')
            ->subject('Duplicate Check')
            ->html('<p>Duplicate Check</p>')
            ->text('Duplicate Check');
        $event = new MessageSending($message, [
            '__laravel_mailable' => ReservationConfirmedMail::class,
        ]);
        $logger = new LogOutgoingEmail();

        $logger->handleSending($event);
        $logger->handleSending($event);

        $this->assertSame(1, EmailLog::query()
            ->where('recipient_email', 'duplicate-check@example.test')
            ->where('subject', 'Duplicate Check')
            ->count());
    }

    public function test_admin_can_inspect_retry_and_export_email_logs(): void
    {
        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
            'status' => User::STATUS_ACTIVE,
        ]);

        $failedLog = EmailLog::query()->create([
            'recipient_name' => 'Failed Recipient',
            'recipient_email' => 'failed@example.test',
            'email_type' => 'System Announcement',
            'module' => EmailLog::MODULE_SYSTEM,
            'subject' => 'System Notice',
            'status' => EmailLog::STATUS_FAILED,
            'html_body' => '<h1>System Notice</h1>',
            'text_body' => 'System Notice',
        ]);

        $successLog = EmailLog::query()->create([
            'recipient_name' => 'Successful Recipient',
            'recipient_email' => 'success@example.test',
            'email_type' => 'Verify Email',
            'module' => EmailLog::MODULE_SYSTEM,
            'subject' => 'Verify your Tiketa email address',
            'status' => EmailLog::STATUS_SUCCESS,
            'sent_at' => now(),
            'html_body' => '<h1>Verify</h1>',
            'text_body' => 'Verify',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/email-center/{$failedLog->id}")
            ->assertOk()
            ->assertJsonPath('data.recipient_email', 'failed@example.test')
            ->assertJsonPath('data.html_body', '<h1>System Notice</h1>')
            ->assertJsonPath('data.can_retry', true);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/email-center/{$successLog->id}/retry")
            ->assertStatus(422);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/email-center/{$failedLog->id}/retry")
            ->assertOk();

        $this->assertDatabaseHas('email_logs', [
            'id' => $failedLog->id,
            'status' => EmailLog::STATUS_FAILED,
        ]);
        $this->assertDatabaseHas('email_logs', [
            'recipient_email' => 'failed@example.test',
            'email_type' => 'System Announcement',
            'module' => EmailLog::MODULE_SYSTEM,
            'subject' => 'System Notice',
            'status' => EmailLog::STATUS_SUCCESS,
        ]);

        $this->actingAs($admin, 'sanctum')
            ->get('/api/admin/email-center/export?format=csv')
            ->assertOk()
            ->assertHeader('content-disposition');

        $this->actingAs($admin, 'sanctum')
            ->get('/api/admin/email-center/export?format=excel')
            ->assertOk()
            ->assertHeader('content-disposition');
    }

    private function createAdminEventWithInventory(User $organizer, string $title, string $slug, string $status, mixed $startsAt, mixed $endsAt, int $total, int $sold): Event
    {
        $event = Event::query()->create([
            'organizer_id' => $organizer->id,
            'title' => $title,
            'slug' => $slug,
            'category' => 'Concerts',
            'venue_name' => 'Tiketa Hall',
            'city' => 'New York',
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
            'status' => $status,
            'visibility' => 'public',
            'currency' => 'USD',
        ]);

        TicketType::query()->create([
            'event_id' => $event->id,
            'name' => 'General Admission',
            'price' => 25,
            'currency' => 'USD',
            'quantity_total' => $total,
            'quantity_sold' => $sold,
            'quantity_reserved' => 0,
            'min_per_order' => 1,
            'max_per_order' => 10,
            'status' => TicketType::STATUS_ACTIVE,
        ]);

        return $event;
    }
}
