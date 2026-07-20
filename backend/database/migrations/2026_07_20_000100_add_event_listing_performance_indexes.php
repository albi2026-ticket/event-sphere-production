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
            ['columns' => ['status', 'visibility', 'is_trending', 'starts_at'], 'name' => 'events_listing_trending_idx'],
            ['columns' => ['status', 'visibility', 'city', 'starts_at'], 'name' => 'events_listing_city_idx'],
            ['columns' => ['status', 'visibility', 'category', 'starts_at'], 'name' => 'events_listing_category_idx'],
            ['columns' => ['status', 'visibility', 'base_price', 'starts_at'], 'name' => 'events_listing_price_idx'],
        ],
        'orders' => [
            ['columns' => ['payment_status', 'id'], 'name' => 'orders_payment_id_idx'],
        ],
        'order_items' => [
            ['columns' => ['order_id', 'event_id', 'created_at'], 'name' => 'order_items_order_event_created_idx'],
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
