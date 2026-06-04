<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table): void {
            $table->uuid('ticket_uuid')->nullable()->unique()->after('id');
            $table->timestamp('issued_at')->nullable()->after('qr_payload');
        });

        DB::table('tickets')
            ->where('status', 'active')
            ->update(['status' => 'valid']);

        DB::table('tickets')
            ->where('status', 'used')
            ->update(['status' => 'checked_in']);

        DB::table('tickets')
            ->whereNull('issued_at')
            ->update(['issued_at' => DB::raw('created_at')]);

        DB::table('tickets')
            ->whereNull('ticket_uuid')
            ->orderBy('id')
            ->lazyById()
            ->each(function (object $ticket): void {
                DB::table('tickets')
                    ->where('id', $ticket->id)
                    ->update(['ticket_uuid' => (string) Str::uuid()]);
            });

        DB::table('tickets')
            ->select(['id', 'ticket_uuid', 'qr_token'])
            ->orderBy('id')
            ->lazyById()
            ->each(function (object $ticket): void {
                DB::table('tickets')
                    ->where('id', $ticket->id)
                    ->update([
                        'qr_payload' => json_encode([
                            'type' => 'event_sphere_ticket',
                            'version' => 1,
                            'ticket_uuid' => $ticket->ticket_uuid,
                            'token' => $ticket->qr_token,
                        ], JSON_THROW_ON_ERROR),
                    ]);
            });
    }

    public function down(): void
    {
        DB::table('tickets')
            ->where('status', 'valid')
            ->update(['status' => 'active']);

        DB::table('tickets')
            ->where('status', 'checked_in')
            ->update(['status' => 'used']);

        Schema::table('tickets', function (Blueprint $table): void {
            $table->dropColumn(['ticket_uuid', 'issued_at']);
        });
    }
};
