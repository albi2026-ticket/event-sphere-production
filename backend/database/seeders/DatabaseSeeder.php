<?php

namespace Database\Seeders;

use App\Models\Event;
use App\Models\EventImage;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Ticket;
use App\Models\TicketType;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        DB::transaction(function (): void {
            $password = Hash::make('Password123!');

            $admin = User::query()->updateOrCreate(
                ['email' => 'admin@eventsphere.test'],
                [
                    'name' => 'Ava Admin',
                    'first_name' => 'Ava',
                    'last_name' => 'Admin',
                    'password' => $password,
                    'role' => User::ROLE_ADMIN,
                    'organizer_status' => User::ORGANIZER_STATUS_NONE,
                    'status' => User::STATUS_ACTIVE,
                    'email_notifications' => true,
                    'sms_reminders' => false,
                    'marketing_emails' => false,
                ],
            );

            $organizer = User::query()->updateOrCreate(
                ['email' => 'organizer@eventsphere.test'],
                [
                    'name' => 'Maya Chen',
                    'first_name' => 'Maya',
                    'last_name' => 'Chen',
                    'password' => $password,
                    'role' => User::ROLE_ORGANIZER,
                    'organizer_status' => User::ORGANIZER_STATUS_APPROVED,
                    'organizer_approved_at' => now()->subDays(10),
                    'organizer_approved_by' => $admin->id,
                    'status' => User::STATUS_ACTIVE,
                    'email_notifications' => true,
                    'sms_reminders' => true,
                    'marketing_emails' => false,
                ],
            );

            $user = User::query()->updateOrCreate(
                ['email' => 'user@eventsphere.test'],
                [
                    'name' => 'Jamie Rivera',
                    'first_name' => 'Jamie',
                    'last_name' => 'Rivera',
                    'password' => $password,
                    'role' => User::ROLE_USER,
                    'default_city' => 'New York',
                    'organizer_status' => User::ORGANIZER_STATUS_NONE,
                    'status' => User::STATUS_ACTIVE,
                    'email_notifications' => true,
                    'sms_reminders' => false,
                    'marketing_emails' => false,
                ],
            );

            $events = [
                [
                    'title' => 'Coldplay - Music of the Spheres',
                    'category' => 'Concerts',
                    'venue_name' => 'Madison Square Garden',
                    'city' => 'New York',
                    'country' => 'USA',
                    'address' => '4 Pennsylvania Plaza',
                    'starts_at' => now()->addDays(32)->setTime(20, 0),
                    'base_price' => 89,
                    'is_featured' => true,
                    'is_trending' => true,
                    'image' => 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&q=80',
                    'description' => 'A stadium-scale concert with immersive visuals, fan favorites, and mobile QR ticketing.',
                ],
                [
                    'title' => 'NBA Finals Game Night',
                    'category' => 'Sports',
                    'venue_name' => 'Barclays Center',
                    'city' => 'Brooklyn',
                    'country' => 'USA',
                    'address' => '620 Atlantic Avenue',
                    'starts_at' => now()->addDays(18)->setTime(19, 30),
                    'base_price' => 120,
                    'is_featured' => true,
                    'is_trending' => true,
                    'image' => 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=1200&q=80',
                    'description' => 'A high-energy basketball matchup with verified seats and instant delivery.',
                ],
                [
                    'title' => 'Tomorrowland City Sessions',
                    'category' => 'Festivals',
                    'venue_name' => 'Grant Park',
                    'city' => 'Chicago',
                    'country' => 'USA',
                    'address' => '337 E Randolph Street',
                    'starts_at' => now()->addDays(45)->setTime(16, 0),
                    'base_price' => 149,
                    'is_featured' => false,
                    'is_trending' => true,
                    'image' => 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1200&q=80',
                    'description' => 'A day-to-night festival experience across multiple stages.',
                ],
                [
                    'title' => 'Future of Product Conference',
                    'category' => 'Conferences',
                    'venue_name' => 'Moscone Center',
                    'city' => 'San Francisco',
                    'country' => 'USA',
                    'address' => '747 Howard Street',
                    'starts_at' => now()->addDays(26)->setTime(9, 0),
                    'base_price' => 249,
                    'is_featured' => false,
                    'is_trending' => false,
                    'image' => 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1200&q=80',
                    'description' => 'A practical conference for builders, founders, product teams, and designers.',
                ],
                [
                    'title' => 'Hamilton Evening Performance',
                    'category' => 'Theater',
                    'venue_name' => 'Richard Rodgers Theatre',
                    'city' => 'New York',
                    'country' => 'USA',
                    'address' => '226 W 46th Street',
                    'starts_at' => now()->addDays(12)->setTime(19, 0),
                    'base_price' => 99,
                    'is_featured' => true,
                    'is_trending' => false,
                    'image' => 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=1200&q=80',
                    'description' => 'An evening theater performance with verified digital admission.',
                ],
            ];

            $seeded = collect($events)->map(function (array $data) use ($organizer): Event {
                $event = Event::withTrashed()->updateOrCreate(
                    ['slug' => Str::slug($data['title'])],
                    [
                        'organizer_id' => $organizer->id,
                        'title' => $data['title'],
                        'category' => $data['category'],
                        'description' => $data['description'],
                        'venue_name' => $data['venue_name'],
                        'city' => $data['city'],
                        'country' => $data['country'],
                        'address' => $data['address'],
                        'starts_at' => $data['starts_at'],
                        'ends_at' => $data['starts_at']->copy()->addHours(3),
                        'timezone' => 'America/New_York',
                        'status' => 'published',
                        'visibility' => 'public',
                        'banner_image_url' => $data['image'],
                        'base_price' => $data['base_price'],
                        'currency' => 'USD',
                        'is_featured' => $data['is_featured'],
                        'is_trending' => $data['is_trending'],
                        'is_verified' => true,
                        'allow_resale' => true,
                        'refund_policy' => 'Refunds available until 24 hours before event start.',
                        'views_count' => random_int(80, 1800),
                        'deleted_at' => null,
                    ],
                );

                if ($event->trashed()) {
                    $event->restore();
                }

                EventImage::query()->updateOrCreate(
                    ['event_id' => $event->id, 'type' => 'banner', 'sort_order' => 0],
                    [
                        'url' => $data['image'],
                        'alt_text' => $data['title'],
                        'is_primary' => true,
                    ],
                );

                $types = [
                    ['name' => 'Early Bird', 'price' => max(25, $data['base_price'] - 25), 'quantity_total' => 80, 'is_vip' => false, 'sort_order' => 1],
                    ['name' => 'General Admission', 'price' => $data['base_price'], 'quantity_total' => 250, 'is_vip' => false, 'sort_order' => 2],
                    ['name' => 'VIP', 'price' => $data['base_price'] + 95, 'quantity_total' => 40, 'is_vip' => true, 'sort_order' => 3],
                ];

                foreach ($types as $type) {
                    TicketType::query()->updateOrCreate(
                        ['event_id' => $event->id, 'name' => $type['name']],
                        [
                            'description' => $type['name'].' ticket for '.$event->title,
                            'price' => $type['price'],
                            'currency' => 'USD',
                            'quantity_total' => $type['quantity_total'],
                            'quantity_sold' => 0,
                            'quantity_reserved' => 0,
                            'min_per_order' => 1,
                            'max_per_order' => $type['is_vip'] ? 4 : 10,
                            'sale_starts_at' => now()->subDays(7),
                            'sale_ends_at' => $event->starts_at->copy()->subHour(),
                            'status' => TicketType::STATUS_ACTIVE,
                            'is_vip' => $type['is_vip'],
                            'is_resale_allowed' => true,
                            'sort_order' => $type['sort_order'],
                        ],
                    );
                }

                return $event;
            });

            $event = $seeded->first();
            $ticketType = $event->ticketTypes()->where('name', 'General Admission')->firstOrFail();
            $quantity = 2;
            $subtotal = (float) $ticketType->price * $quantity;
            $serviceFee = round($subtotal * 0.05, 2);
            $total = $subtotal + $serviceFee;

            $order = Order::query()->updateOrCreate(
                ['order_number' => 'ES-DEMO-000001'],
                [
                    'user_id' => $user->id,
                    'status' => Order::STATUS_PAID,
                    'payment_status' => Order::PAYMENT_STATUS_PAID,
                    'subtotal' => $subtotal,
                    'service_fee' => $serviceFee,
                    'refund_protection_fee' => 0,
                    'discount_total' => 0,
                    'tax_total' => 0,
                    'total' => $total,
                    'currency' => 'USD',
                    'payment_provider' => 'demo',
                    'payment_reference' => 'demo-paid-order',
                    'billing_email' => $user->email,
                    'billing_first_name' => $user->first_name,
                    'billing_last_name' => $user->last_name,
                    'billing_city' => $user->default_city,
                    'billing_country' => 'USA',
                    'paid_at' => now()->subDays(2),
                    'checkout_expires_at' => now()->addDays(1),
                ],
            );

            $item = OrderItem::query()->updateOrCreate(
                ['order_id' => $order->id, 'ticket_type_id' => $ticketType->id],
                [
                    'event_id' => $event->id,
                    'quantity' => $quantity,
                    'unit_price' => $ticketType->price,
                    'service_fee' => $serviceFee,
                    'total' => $total,
                    'ticket_type_name' => $ticketType->name,
                    'event_title' => $event->title,
                    'event_starts_at' => $event->starts_at,
                ],
            );

            foreach (range(1, $quantity) as $index) {
                Ticket::query()->updateOrCreate(
                    ['ticket_code' => 'ES-DEMO-TICKET-00'.$index],
                    [
                        'qr_token' => 'demo-ticket-token-'.$index,
                        'qr_payload' => json_encode([
                            'ticket_code' => 'ES-DEMO-TICKET-00'.$index,
                            'event_id' => $event->id,
                            'order_number' => $order->order_number,
                        ]),
                        'user_id' => $user->id,
                        'event_id' => $event->id,
                        'ticket_type_id' => $ticketType->id,
                        'order_id' => $order->id,
                        'order_item_id' => $item->id,
                        'seat_label' => 'GA-'.$index,
                        'status' => Ticket::STATUS_ACTIVE,
                        'transfer_status' => null,
                    ],
                );
            }

            $ticketType->update(['quantity_sold' => $quantity, 'quantity_reserved' => 0]);
        });
    }
}
