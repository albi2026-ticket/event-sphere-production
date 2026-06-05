<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('platform_settings')) {
            Schema::create('platform_settings', function (Blueprint $table): void {
                $table->id();
                $table->string('key')->unique();
                $table->json('value')->nullable();
                $table->timestamps();
            });
        }

        $exists = DB::table('platform_settings')
            ->where('key', 'default_service_fee_percentage')
            ->exists();

        if ($exists) {
            DB::table('platform_settings')
                ->where('key', 'default_service_fee_percentage')
                ->update([
                    'value' => json_encode(10),
                    'updated_at' => now(),
                ]);
        } else {
            DB::table('platform_settings')->insert([
                'key' => 'default_service_fee_percentage',
                'value' => json_encode(10),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_settings');
    }
};
