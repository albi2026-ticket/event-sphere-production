<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('email_logs')) {
            return;
        }

        $columns = array_values(array_filter([
            Schema::hasColumn('email_logs', 'html_body') ? 'html_body' : null,
            Schema::hasColumn('email_logs', 'text_body') ? 'text_body' : null,
        ]));

        if ($columns === []) {
            return;
        }

        Schema::table('email_logs', function (Blueprint $table) use ($columns): void {
            $table->dropColumn($columns);
        });
    }

    public function down(): void
    {
        // Intentionally irreversible: rendered email bodies must not be restored.
    }
};
