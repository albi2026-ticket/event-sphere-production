<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('venues')
            ->where('status', 'draft')
            ->update(['status' => 'active']);

        if (Schema::hasColumn('venues', 'reservation_enabled')) {
            Schema::table('venues', function (Blueprint $table): void {
                $table->dropColumn('reservation_enabled');
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasColumn('venues', 'reservation_enabled')) {
            Schema::table('venues', function (Blueprint $table): void {
                $table->boolean('reservation_enabled')->default(true)->index();
            });
        }
    }
};
