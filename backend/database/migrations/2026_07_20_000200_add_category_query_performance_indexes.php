<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('event_categories', function (Blueprint $table): void {
            if (! $this->indexExists('event_categories', 'event_categories_active_sort_name_idx')) {
                $table->index(['is_active', 'sort_order', 'name'], 'event_categories_active_sort_name_idx');
            }
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement(
                "CREATE INDEX IF NOT EXISTS events_public_lower_category_rank_idx
                ON events (LOWER(category), created_at DESC, starts_at ASC, id)
                WHERE deleted_at IS NULL AND status = 'published' AND visibility = 'public'"
            );
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS events_public_lower_category_rank_idx');
        }

        Schema::table('event_categories', function (Blueprint $table): void {
            if ($this->indexExists('event_categories', 'event_categories_active_sort_name_idx')) {
                $table->dropIndex('event_categories_active_sort_name_idx');
            }
        });
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
