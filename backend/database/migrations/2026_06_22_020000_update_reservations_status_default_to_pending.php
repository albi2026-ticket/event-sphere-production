<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('reservations') || DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement("ALTER TABLE reservations ALTER COLUMN status SET DEFAULT 'pending'");
    }

    public function down(): void
    {
        if (! Schema::hasTable('reservations') || DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement("ALTER TABLE reservations ALTER COLUMN status SET DEFAULT 'confirmed'");
    }
};
