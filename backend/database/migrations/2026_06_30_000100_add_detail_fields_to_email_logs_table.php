<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('email_logs') || Schema::hasColumn('email_logs', 'html_body')) {
            return;
        }

        Schema::table('email_logs', function (Blueprint $table): void {
            $table->string('mailable_class')->nullable()->after('status');
            $table->longText('html_body')->nullable()->after('mailable_class');
            $table->longText('text_body')->nullable()->after('html_body');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('email_logs') || ! Schema::hasColumn('email_logs', 'html_body')) {
            return;
        }

        Schema::table('email_logs', function (Blueprint $table): void {
            $table->dropColumn(['mailable_class', 'html_body', 'text_body']);
        });
    }
};
