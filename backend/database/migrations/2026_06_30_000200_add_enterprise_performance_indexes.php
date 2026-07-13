<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * @var array<string, array<int, array{columns: array<int, string>, name: string}>>
     */
    private array $indexes = [
        'notifications' => [
            ['columns' => ['user_id', 'is_read', 'created_at'], 'name' => 'notifications_user_read_created_idx'],
            ['columns' => ['user_id', 'created_at'], 'name' => 'notifications_user_created_idx'],
        ],
        'reservations' => [
            ['columns' => ['venue_id', 'status', 'reservation_date'], 'name' => 'reservations_venue_status_date_idx'],
            ['columns' => ['status', 'reservation_date'], 'name' => 'reservations_status_date_idx'],
        ],
        'orders' => [
            ['columns' => ['payment_status', 'created_at'], 'name' => 'orders_payment_created_idx'],
            ['columns' => ['user_id', 'payment_status', 'created_at'], 'name' => 'orders_user_payment_created_idx'],
        ],
        'order_items' => [
            ['columns' => ['event_id', 'order_id'], 'name' => 'order_items_event_order_idx'],
            ['columns' => ['event_id', 'ticket_type_id'], 'name' => 'order_items_event_ticket_type_idx'],
        ],
        'tickets' => [
            ['columns' => ['event_id', 'checked_in_at'], 'name' => 'tickets_event_checked_in_idx'],
            ['columns' => ['event_id', 'status', 'created_at'], 'name' => 'tickets_event_status_created_idx'],
        ],
        'ticket_validation_logs' => [
            ['columns' => ['scanned_by', 'scanned_at'], 'name' => 'ticket_validation_logs_scanner_scanned_idx'],
            ['columns' => ['event_id', 'scanned_at'], 'name' => 'ticket_validation_logs_event_scanned_idx'],
        ],
        'audit_logs' => [
            ['columns' => ['auditable_type', 'auditable_id', 'created_at'], 'name' => 'audit_logs_auditable_created_idx'],
        ],
        'email_logs' => [
            ['columns' => ['module', 'status', 'created_at'], 'name' => 'email_logs_module_status_created_idx'],
        ],
        'events' => [
            ['columns' => ['status', 'visibility', 'starts_at'], 'name' => 'events_status_visibility_starts_idx'],
        ],
        'venues' => [
            ['columns' => ['status', 'city'], 'name' => 'venues_status_city_idx'],
            ['columns' => ['status', 'venue_type', 'city'], 'name' => 'venues_status_type_city_idx'],
        ],
    ];

    public function up(): void
    {
        foreach ($this->indexes as $tableName => $indexes) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName, $indexes): void {
                foreach ($indexes as $index) {
                    if (! $this->indexExists($tableName, $index['name'])) {
                        $table->index($index['columns'], $index['name']);
                    }
                }
            });
        }
    }

    public function down(): void
    {
        foreach (array_reverse($this->indexes) as $tableName => $indexes) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName, $indexes): void {
                foreach (array_reverse($indexes) as $index) {
                    if ($this->indexExists($tableName, $index['name'])) {
                        $table->dropIndex($index['name']);
                    }
                }
            });
        }
    }

    private function indexExists(string $table, string $name): bool
    {
        foreach (Schema::getIndexes($table) as $index) {
            if (($index['name'] ?? null) === $name) {
                return true;
            }
        }

        return false;
    }
};
