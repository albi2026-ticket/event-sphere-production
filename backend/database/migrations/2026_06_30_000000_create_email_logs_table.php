<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_logs', function (Blueprint $table): void {
            $table->id();
            $table->string('recipient_name')->nullable();
            $table->string('recipient_email')->index();
            $table->string('email_type')->index();
            $table->string('module')->index();
            $table->string('subject');
            $table->string('status')->index();
            $table->string('mailable_class')->nullable();
            $table->longText('html_body')->nullable();
            $table->longText('text_body')->nullable();
            $table->timestamp('sent_at')->nullable()->index();
            $table->foreignId('related_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('related_event_id')->nullable()->constrained('events')->nullOnDelete();
            $table->foreignId('related_reservation_id')->nullable()->constrained('reservations')->nullOnDelete();
            $table->foreignId('related_order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->timestamps();

            $table->index(['module', 'status']);
            $table->index(['created_at', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_logs');
    }
};
