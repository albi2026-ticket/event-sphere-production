<?php

use App\Models\Ticket;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table): void {
            $table->text('qr_payload')->nullable()->after('qr_token');
            $table->string('checked_in_method')->nullable()->after('checked_in_by');
            $table->text('checked_in_notes')->nullable()->after('checked_in_method');
            $table->timestamp('downloaded_at')->nullable()->after('transferred_at');
            $table->unsignedInteger('download_count')->default(0)->after('downloaded_at');
        });

        DB::table('tickets')
            ->where('status', 'valid')
            ->update(['status' => Ticket::STATUS_ACTIVE]);
    }

    public function down(): void
    {
        DB::table('tickets')
            ->where('status', Ticket::STATUS_ACTIVE)
            ->update(['status' => 'valid']);

        Schema::table('tickets', function (Blueprint $table): void {
            $table->dropColumn([
                'qr_payload',
                'checked_in_method',
                'checked_in_notes',
                'downloaded_at',
                'download_count',
            ]);
        });
    }
};
