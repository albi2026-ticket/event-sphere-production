<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('event_images', function (Blueprint $table) {
            $table->string('disk')->nullable()->after('event_id');
            $table->string('path')->nullable()->after('disk');
            $table->string('original_name')->nullable()->after('url');
            $table->string('mime_type')->nullable()->after('original_name');
            $table->unsignedBigInteger('size')->nullable()->after('mime_type');
            $table->unsignedInteger('width')->nullable()->after('size');
            $table->unsignedInteger('height')->nullable()->after('width');
            $table->index(['disk', 'path']);
        });
    }

    public function down(): void
    {
        Schema::table('event_images', function (Blueprint $table) {
            $table->dropIndex(['disk', 'path']);
            $table->dropColumn([
                'disk',
                'path',
                'original_name',
                'mime_type',
                'size',
                'width',
                'height',
            ]);
        });
    }
};
