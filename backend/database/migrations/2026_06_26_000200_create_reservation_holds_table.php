<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reservation_holds', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('venue_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('party_size');
            $table->date('reservation_date');
            $table->time('reservation_time');
            $table->timestamp('reserved_at');
            $table->timestamp('expires_at')->index();
            $table->string('status')->default('active')->index();
            $table->timestamps();

            $table->index(['venue_id', 'reservation_date', 'reservation_time', 'status', 'expires_at'], 'reservation_holds_slot_idx');
            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reservation_holds');
    }
};
