<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('venues', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('venue_type')->index();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('website')->nullable();
            $table->text('address')->nullable();
            $table->string('city')->index();
            $table->string('country')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->text('logo_image')->nullable();
            $table->string('status')->default('draft')->index();
            $table->boolean('featured')->default(false)->index();
            $table->boolean('reservation_enabled')->default(false)->index();
            $table->unsignedSmallInteger('min_guests')->default(1);
            $table->unsignedSmallInteger('max_guests')->default(10);
            $table->unsignedSmallInteger('reservation_interval_minutes')->default(30);
            $table->time('last_reservation_time')->nullable();
            $table->string('facebook_url')->nullable();
            $table->string('instagram_url')->nullable();
            $table->string('tiktok_url')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['status', 'featured']);
            $table->index(['venue_type', 'city']);
        });

        Schema::create('venue_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venue_id')->constrained()->cascadeOnDelete();
            $table->text('image_path');
            $table->unsignedInteger('sort_order')->default(0)->index();
            $table->timestamps();

            $table->index(['venue_id', 'sort_order']);
        });

        Schema::create('venue_facilities', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('slug')->unique();
            $table->string('icon')->nullable();
            $table->timestamps();
        });

        Schema::create('venue_facility', function (Blueprint $table) {
            $table->foreignId('venue_id')->constrained()->cascadeOnDelete();
            $table->foreignId('facility_id')->constrained('venue_facilities')->cascadeOnDelete();

            $table->primary(['venue_id', 'facility_id']);
        });

        Schema::create('cuisine_types', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('slug')->unique();
            $table->timestamps();
        });

        Schema::create('venue_cuisine', function (Blueprint $table) {
            $table->foreignId('venue_id')->constrained()->cascadeOnDelete();
            $table->foreignId('cuisine_type_id')->constrained()->cascadeOnDelete();

            $table->primary(['venue_id', 'cuisine_type_id']);
        });

        Schema::create('payment_options', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('slug')->unique();
            $table->timestamps();
        });

        Schema::create('venue_payment_option', function (Blueprint $table) {
            $table->foreignId('venue_id')->constrained()->cascadeOnDelete();
            $table->foreignId('payment_option_id')->constrained()->cascadeOnDelete();

            $table->primary(['venue_id', 'payment_option_id']);
        });

        Schema::create('venue_opening_hours', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venue_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('day_of_week');
            $table->time('opens_at')->nullable();
            $table->time('closes_at')->nullable();
            $table->boolean('is_closed')->default(false);
            $table->timestamps();

            $table->unique(['venue_id', 'day_of_week']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('venue_opening_hours');
        Schema::dropIfExists('venue_payment_option');
        Schema::dropIfExists('payment_options');
        Schema::dropIfExists('venue_cuisine');
        Schema::dropIfExists('cuisine_types');
        Schema::dropIfExists('venue_facility');
        Schema::dropIfExists('venue_facilities');
        Schema::dropIfExists('venue_images');
        Schema::dropIfExists('venues');
    }
};
