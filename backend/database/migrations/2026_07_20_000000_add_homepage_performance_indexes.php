<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * @var array<string, array<int, array{columns: array<int, string>, name: string}>>
     */
    private array $indexes = [
        'events' => [
            ['columns' => ['status', 'visibility', 'is_featured', 'starts_at'], 'name' => 'events_homepage_featured_idx'],
            ['columns' => ['status', 'visibility', 'created_at', 'starts_at'], 'name' => 'events_homepage_rank_idx'],
        ],
        'favorites' => [
            ['columns' => ['event_id'], 'name' => 'favorites_event_id_idx'],
        ],
        'order_items' => [
            ['columns' => ['event_id', 'created_at', 'order_id'], 'name' => 'order_items_event_created_order_idx'],
        ],
        'ticket_types' => [
            ['columns' => ['event_id', 'status', 'price'], 'name' => 'ticket_types_event_status_price_idx'],
        ],
        'event_images' => [
            ['columns' => ['event_id', 'is_primary', 'is_banner', 'sort_order', 'id'], 'name' => 'event_images_homepage_order_idx'],
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
