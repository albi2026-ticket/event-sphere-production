<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('event_id')->constrained()->restrictOnDelete();
            $table->foreignId('ticket_type_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('quantity');
            $table->decimal('unit_price', 10, 2);
            $table->decimal('service_fee', 10, 2)->default(0);
            $table->decimal('total', 10, 2);
            $table->string('ticket_type_name');
            $table->string('event_title');
            $table->timestamp('event_starts_at');
            $table->timestamps();

            $table->index(['order_id', 'event_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};
