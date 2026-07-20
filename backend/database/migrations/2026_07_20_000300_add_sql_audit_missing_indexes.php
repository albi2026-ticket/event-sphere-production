<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * @var array<string, array<int, array{columns: array<int, string>, name: string}>>
     */
    private array $btreeIndexes = [
        'favorites' => [
            ['columns' => ['event_id'], 'name' => 'sql_audit_favorites_event_id_idx'],
        ],
        'order_items' => [
            ['columns' => ['event_id', 'created_at', 'order_id'], 'name' => 'sql_audit_order_items_event_created_order_idx'],
        ],
        'ticket_types' => [
            ['columns' => ['event_id', 'status', 'price'], 'name' => 'sql_audit_ticket_types_event_status_price_idx'],
        ],
    ];

    public function up(): void
    {
        foreach ($this->btreeIndexes as $tableName => $indexes) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName, $indexes): void {
                foreach ($indexes as $index) {
                    if (! $this->indexWithColumnsExists($tableName, $index['columns'])) {
                        $table->index($index['columns'], $index['name']);
                    }
                }
            });
        }

        if (DB::getDriverName() === 'pgsql') {
            DB::statement(
                "CREATE INDEX IF NOT EXISTS sql_audit_events_lower_category_public_rank_idx
                ON events (LOWER(category), created_at DESC, starts_at ASC, id)
                WHERE deleted_at IS NULL AND status = 'published' AND visibility = 'public'"
            );

            DB::statement(
                "CREATE INDEX IF NOT EXISTS sql_audit_events_public_discovery_starts_idx
                ON events (starts_at ASC, id)
                WHERE deleted_at IS NULL AND status = 'published' AND visibility = 'public'"
            );

            DB::statement(
                "CREATE INDEX IF NOT EXISTS sql_audit_events_public_discovery_created_starts_idx
                ON events (created_at DESC, starts_at ASC, id)
                WHERE deleted_at IS NULL AND status = 'published' AND visibility = 'public'"
            );
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS sql_audit_events_public_discovery_created_starts_idx');
            DB::statement('DROP INDEX IF EXISTS sql_audit_events_public_discovery_starts_idx');
            DB::statement('DROP INDEX IF EXISTS sql_audit_events_lower_category_public_rank_idx');
        }

        foreach (array_reverse($this->btreeIndexes) as $tableName => $indexes) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName, $indexes): void {
                foreach (array_reverse($indexes) as $index) {
                    if ($this->indexExists($tableName, $index['name'])) {
                        $table->dropIndex($index['name']);
                    }
                }
            });
        }
    }

    /**
     * @param array<int, string> $columns
     */
    private function indexWithColumnsExists(string $table, array $columns): bool
    {
        foreach (Schema::getIndexes($table) as $index) {
            if (($index['columns'] ?? []) === $columns) {
                return true;
            }
        }

        return false;
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
