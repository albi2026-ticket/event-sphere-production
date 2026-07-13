<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('event_images', function (Blueprint $table): void {
            if (! Schema::hasColumn('event_images', 'is_banner')) {
                $table->boolean('is_banner')->default(false)->after('is_primary');
                $table->index(['event_id', 'is_banner']);
            }
        });

        DB::table('event_images')
            ->where('type', 'banner')
            ->update(['is_banner' => true]);
    }

    public function down(): void
    {
        Schema::table('event_images', function (Blueprint $table): void {
            if (Schema::hasColumn('event_images', 'is_banner')) {
                $table->dropIndex(['event_id', 'is_banner']);
                $table->dropColumn('is_banner');
            }
        });
    }
};
