<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->text('url');
            $table->string('alt_text')->nullable();
            $table->string('type')->default('gallery');
            $table->unsignedInteger('sort_order')->default(0)->index();
            $table->boolean('is_primary')->default(false);
            $table->timestamps();

            $table->index(['event_id', 'type']);
            $table->index(['event_id', 'is_primary']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_images');
    }
};
