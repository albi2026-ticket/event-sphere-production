<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ticket_types', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('price', 10, 2)->index();
            $table->char('currency', 3)->default('USD');
            $table->unsignedInteger('quantity_total');
            $table->unsignedInteger('quantity_sold')->default(0);
            $table->unsignedInteger('quantity_reserved')->default(0);
            $table->unsignedInteger('min_per_order')->default(1);
            $table->unsignedInteger('max_per_order')->default(10);
            $table->timestamp('sale_starts_at')->nullable();
            $table->timestamp('sale_ends_at')->nullable();
            $table->string('status')->default('active')->index();
            $table->boolean('is_vip')->default(false);
            $table->boolean('is_resale_allowed')->default(true);
            $table->timestamps();

            $table->index(['event_id', 'status']);
            $table->index(['sale_starts_at', 'sale_ends_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_types');
    }
};
