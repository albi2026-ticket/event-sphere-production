<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('venues', function (Blueprint $table): void {
            if (! Schema::hasColumn('venues', 'max_reservations_per_slot')) {
                $table->unsignedSmallInteger('max_reservations_per_slot')->default(10)->after('reservation_interval_minutes');
            }
        });
    }

    public function down(): void
    {
        Schema::table('venues', function (Blueprint $table): void {
            if (Schema::hasColumn('venues', 'max_reservations_per_slot')) {
                $table->dropColumn('max_reservations_per_slot');
            }
        });
    }
};
