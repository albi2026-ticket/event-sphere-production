<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('event_categories')) {
            Schema::create('event_categories', function (Blueprint $table): void {
                $table->id();
                $table->string('name')->unique();
                $table->string('slug')->unique();
                $table->string('icon')->nullable();
                $table->boolean('is_active')->default(true)->index();
                $table->unsignedInteger('sort_order')->default(0);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('email_templates')) {
            Schema::create('email_templates', function (Blueprint $table): void {
                $table->id();
                $table->string('key')->unique();
                $table->string('name');
                $table->string('subject')->nullable();
                $table->longText('html_template')->nullable();
                $table->longText('text_template')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('audit_logs')) {
            Schema::create('audit_logs', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('action')->index();
                $table->string('auditable_type')->nullable()->index();
                $table->unsignedBigInteger('auditable_id')->nullable()->index();
                $table->json('metadata')->nullable();
                $table->string('ip_address')->nullable();
                $table->timestamps();
            });
        }

        $categories = ['Concerts', 'Sports', 'Festivals', 'Theater', 'Comedy', 'Conferences'];
        foreach ($categories as $index => $name) {
            DB::table('event_categories')->updateOrInsert(
                ['slug' => Str::slug($name)],
                [
                    'name' => $name,
                    'icon' => match ($name) {
                        'Concerts' => 'bi-music-note-beamed',
                        'Sports' => 'bi-trophy',
                        'Festivals' => 'bi-stars',
                        'Theater' => 'bi-mask',
                        'Comedy' => 'bi-emoji-laughing',
                        default => 'bi-mic',
                    },
                    'is_active' => true,
                    'sort_order' => $index + 1,
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        }

        $templates = [
            [
                'key' => 'order_confirmation',
                'name' => 'Order Confirmation Email',
                'subject' => 'Your Event Sphere tickets for order {{ $order->order_number }}',
                'html_template' => null,
                'text_template' => null,
            ],
            [
                'key' => 'event_reminder',
                'name' => 'Event Reminder Email',
                'subject' => 'Reminder: {{ $event_name ?? "Your event" }} is coming up',
                'html_template' => '<p>Hello {{ $user_name ?? "there" }},</p><p>This is a reminder for {{ $event_name ?? "your event" }}.</p>',
                'text_template' => 'Hello {{ $user_name ?? "there" }},\n\nThis is a reminder for {{ $event_name ?? "your event" }}.',
            ],
            [
                'key' => 'verification_email',
                'name' => 'Verification Email',
                'subject' => 'Verify your Event Sphere email',
                'html_template' => '<p>Welcome to Event Sphere, {{ $user_name ?? "there" }}.</p><p>Please verify your email address.</p>',
                'text_template' => 'Welcome to Event Sphere, {{ $user_name ?? "there" }}.\n\nPlease verify your email address.',
            ],
            [
                'key' => 'event_cancelled',
                'name' => 'Event Cancelled Email',
                'subject' => 'Event cancelled: {{ $event_name ?? "Event" }}',
                'html_template' => '<p>{{ $event_name ?? "This event" }} has been cancelled.</p>',
                'text_template' => '{{ $event_name ?? "This event" }} has been cancelled.',
            ],
            [
                'key' => 'event_updated',
                'name' => 'Event Updated Email',
                'subject' => 'Event updated: {{ $event_name ?? "Event" }}',
                'html_template' => '<p>{{ $event_name ?? "This event" }} has been updated.</p>',
                'text_template' => '{{ $event_name ?? "This event" }} has been updated.',
            ],
            [
                'key' => 'marketing_email',
                'name' => 'Marketing Email',
                'subject' => 'Latest from Event Sphere',
                'html_template' => '<p>Discover new events on Event Sphere.</p>',
                'text_template' => 'Discover new events on Event Sphere.',
            ],
        ];

        foreach ($templates as $template) {
            DB::table('email_templates')->updateOrInsert(
                ['key' => $template['key']],
                array_merge($template, [
                    'is_active' => true,
                    'updated_at' => now(),
                    'created_at' => now(),
                ])
            );
        }

        $settings = [
            'platform_name' => 'Event Sphere',
            'support_email' => 'support@eventsphere.com',
            'contact_information' => 'Event Sphere Support',
            'default_purchase_limit' => 10,
            'default_event_status' => 'draft',
            'auto_archive_days_after_event' => 7,
            'reminder_timing_hours' => 24,
            'verification_link_expiration_minutes' => 60,
            'maintenance_mode' => false,
            'registration_enabled' => true,
        ];

        foreach ($settings as $key => $value) {
            DB::table('platform_settings')->updateOrInsert(
                ['key' => $key],
                [
                    'value' => json_encode($value),
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('email_templates');
        Schema::dropIfExists('event_categories');
    }
};
