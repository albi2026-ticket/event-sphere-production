<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedSmallInteger('rating')->index();
            $table->string('title')->nullable();
            $table->text('body')->nullable();
            $table->string('status')->default('published')->index();
            $table->boolean('is_verified_purchase')->default(false);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['event_id', 'status']);
            $table->unique(['user_id', 'event_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};
