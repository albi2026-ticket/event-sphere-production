<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('reservations', 'deleted_at')) {
            Schema::table('reservations', function (Blueprint $table): void {
                $table->softDeletes()->after('updated_at');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('reservations', 'deleted_at')) {
            Schema::table('reservations', function (Blueprint $table): void {
                $table->dropSoftDeletes();
            });
        }
    }
};
