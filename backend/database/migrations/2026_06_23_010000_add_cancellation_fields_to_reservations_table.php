<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            if (! Schema::hasColumn('reservations', 'cancellation_reason')) {
                $table->text('cancellation_reason')->nullable()->after('notes');
            }

            if (! Schema::hasColumn('reservations', 'cancelled_at')) {
                $table->timestamp('cancelled_at')->nullable()->after('cancellation_reason');
            }
        });
    }

    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $columns = array_values(array_filter([
                Schema::hasColumn('reservations', 'cancellation_reason') ? 'cancellation_reason' : null,
                Schema::hasColumn('reservations', 'cancelled_at') ? 'cancelled_at' : null,
            ]));

            if ($columns) {
                $table->dropColumn($columns);
            }
        });
    }
};
