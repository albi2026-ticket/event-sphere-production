<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scanner_event', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('scanner_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['scanner_id', 'event_id']);
            $table->index(['event_id', 'scanner_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scanner_event');
    }
};
