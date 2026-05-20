<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organizer_id')->constrained('users')->restrictOnDelete();
            $table->string('title');
            $table->string('slug')->unique();
            $table->string('category')->index();
            $table->text('description')->nullable();
            $table->string('venue_name');
            $table->string('city')->index();
            $table->string('country')->nullable();
            $table->text('address')->nullable();
            $table->timestamp('starts_at')->index();
            $table->timestamp('ends_at')->nullable();
            $table->string('timezone')->nullable();
            $table->string('status')->default('draft')->index();
            $table->string('visibility')->default('public');
            $table->text('banner_image_url')->nullable();
            $table->decimal('base_price', 10, 2)->nullable();
            $table->char('currency', 3)->default('USD');
            $table->boolean('is_featured')->default(false)->index();
            $table->boolean('is_trending')->default(false)->index();
            $table->boolean('is_verified')->default(false);
            $table->boolean('allow_resale')->default(true);
            $table->string('refund_policy')->nullable();
            $table->unsignedInteger('views_count')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['organizer_id', 'status']);
            $table->index(['status', 'starts_at']);
            $table->index(['category', 'city', 'starts_at']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};
