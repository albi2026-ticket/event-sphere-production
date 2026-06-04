<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ticket_validation_logs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('event_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('ticket_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('scanned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('result')->index();
            $table->string('method')->default('qr')->index();
            $table->timestamp('scanned_at')->index();
            $table->string('attendee_name')->nullable();
            $table->string('attendee_email')->nullable();
            $table->string('ticket_code')->nullable()->index();
            $table->string('ticket_uuid')->nullable()->index();
            $table->string('token_hash', 64)->nullable()->index();
            $table->string('ip_address')->nullable();
            $table->text('user_agent')->nullable();
            $table->string('message')->nullable();
            $table->timestamps();

            $table->index(['event_id', 'result', 'scanned_at']);
            $table->index(['ticket_id', 'scanned_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_validation_logs');
    }
};
