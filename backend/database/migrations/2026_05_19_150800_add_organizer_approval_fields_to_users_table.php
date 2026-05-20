<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('users', 'organizer_status')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->string('organizer_status')->default('none')->after('marketing_emails')->index();
            $table->timestamp('organizer_approved_at')->nullable()->after('organizer_status');
            $table->foreignId('organizer_approved_by')->nullable()->after('organizer_approved_at')->constrained('users')->nullOnDelete();
            $table->index(['role', 'organizer_status']);
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('users', 'organizer_status')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['organizer_status']);
            $table->dropIndex(['role', 'organizer_status']);
            $table->dropForeign(['organizer_approved_by']);
            $table->dropColumn([
                'organizer_status',
                'organizer_approved_at',
                'organizer_approved_by',
            ]);
        });
    }
};
