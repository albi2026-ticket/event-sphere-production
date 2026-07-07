<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * @var array<int, string>
     */
    private array $legacyExternalUrls = [
        1 => 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&q=80',
        2 => 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=1200&q=80',
        3 => 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1200&q=80',
        4 => 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1200&q=80',
        5 => 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=1200&q=80',
        11 => 'https://kosovo.mom-gmr.org/en/media/detail/outlet/klan-kosova-2/',
    ];

    public function up(): void
    {
        foreach ($this->legacyExternalUrls as $id => $url) {
            DB::table('event_images')
                ->where('id', $id)
                ->whereNull('disk')
                ->whereNull('path')
                ->whereNull('url')
                ->update(['url' => $url]);
        }
    }

    public function down(): void
    {
        DB::table('event_images')
            ->whereIn('id', array_keys($this->legacyExternalUrls))
            ->whereNull('disk')
            ->whereNull('path')
            ->update(['url' => null]);
    }
};
