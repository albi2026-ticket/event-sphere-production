<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('email_logs') || Schema::hasColumn('email_logs', 'mailable_class')) {
            return;
        }

        Schema::table('email_logs', function (Blueprint $table): void {
            $table->string('mailable_class')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('email_logs') || ! Schema::hasColumn('email_logs', 'mailable_class')) {
            return;
        }

        Schema::table('email_logs', function (Blueprint $table): void {
            $table->dropColumn(['mailable_class']);
        });
    }
};
