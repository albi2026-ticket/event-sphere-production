<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('ticket_validation_logs') || ! Schema::hasColumn('ticket_validation_logs', 'ticket_uuid')) {
            return;
        }

        DB::table('ticket_validation_logs')
            ->select(['id', 'ticket_uuid'])
            ->whereNotNull('ticket_uuid')
            ->orderBy('id')
            ->chunkById(500, function ($logs): void {
                foreach ($logs as $log) {
                    DB::table('ticket_validation_logs')
                        ->where('id', $log->id)
                        ->update(['ticket_uuid' => $this->maskQrIdentifier((string) $log->ticket_uuid)]);
                }
            });
    }

    public function down(): void
    {
        // Intentionally irreversible: raw QR payload identifiers must not be restored to validation logs.
    }

    private function maskQrIdentifier(string $value): string
    {
        if ($value === '') {
            return $value;
        }

        if (strlen($value) <= 10) {
            return str_repeat('*', strlen($value));
        }

        return substr($value, 0, 6).'...'.substr($value, -4);
    }
};
