<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_items', function (Blueprint $table): void {
            $table->json('attendee_details')->nullable()->after('event_starts_at');
        });

        Schema::table('tickets', function (Blueprint $table): void {
            $table->string('attendee_name')->nullable()->after('seat_label');
            $table->string('attendee_email')->nullable()->after('attendee_name');
            $table->string('attendee_phone')->nullable()->after('attendee_email');
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table): void {
            $table->dropColumn([
                'attendee_name',
                'attendee_email',
                'attendee_phone',
            ]);
        });

        Schema::table('order_items', function (Blueprint $table): void {
            $table->dropColumn('attendee_details');
        });
    }
};
