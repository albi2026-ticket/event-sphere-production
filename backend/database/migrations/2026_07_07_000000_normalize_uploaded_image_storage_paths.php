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
            $table->text('url')->nullable()->change();
        });

        Schema::table('venue_images', function (Blueprint $table): void {
            if (! Schema::hasColumn('venue_images', 'disk')) {
                $table->string('disk')->nullable()->after('venue_id');
            }

            if (! Schema::hasColumn('venue_images', 'path')) {
                $table->string('path')->nullable()->after('disk');
            }
        });

        DB::table('event_images')
            ->whereNotNull('disk')
            ->whereNotNull('path')
            ->update(['url' => null]);

        DB::table('events')
            ->where(function ($query): void {
                $query->where('banner_image_url', 'like', 'http://localhost:%/storage/%')
                    ->orWhere('banner_image_url', 'like', 'http://127.0.0.1:%/storage/%');
            })
            ->update(['banner_image_url' => null]);

        DB::table('venue_images')
            ->whereNull('disk')
            ->whereNotNull('image_path')
            ->where('image_path', 'not like', 'http://%')
            ->where('image_path', 'not like', 'https://%')
            ->where('image_path', 'not like', 'data:%')
            ->update(['disk' => 'public']);

        DB::table('venue_images')
            ->whereNull('path')
            ->whereNotNull('image_path')
            ->where('image_path', 'not like', 'http://%')
            ->where('image_path', 'not like', 'https://%')
            ->where('image_path', 'not like', 'data:%')
            ->update(['path' => DB::raw('image_path')]);
    }

    public function down(): void
    {
        Schema::table('venue_images', function (Blueprint $table): void {
            if (Schema::hasColumn('venue_images', 'path')) {
                $table->dropColumn('path');
            }

            if (Schema::hasColumn('venue_images', 'disk')) {
                $table->dropColumn('disk');
            }
        });

        Schema::table('event_images', function (Blueprint $table): void {
            $table->text('url')->nullable(false)->change();
        });
    }
};
