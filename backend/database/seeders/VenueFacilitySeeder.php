<?php

namespace Database\Seeders;

use App\Models\VenueFacility;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class VenueFacilitySeeder extends Seeder
{
    public function run(): void
    {
        $facilities = [
            ['name' => 'WiFi', 'icon' => 'wifi'],
            ['name' => 'Parking', 'icon' => 'parking-circle'],
            ['name' => 'Live Music', 'icon' => 'music'],
            ['name' => 'Outdoor Seating', 'icon' => 'trees'],
            ['name' => 'Private Room', 'icon' => 'door-closed'],
            ['name' => 'Wheelchair Access', 'icon' => 'accessibility'],
            ['name' => 'Cocktail Bar', 'icon' => 'martini'],
            ['name' => 'Smoking Area', 'icon' => 'cigarette'],
            ['name' => 'Pet Friendly', 'icon' => 'paw-print'],
            ['name' => 'Kids Area', 'icon' => 'baby'],
            ['name' => 'VIP Area', 'icon' => 'badge-star'],
            ['name' => 'Rooftop', 'icon' => 'building-2'],
            ['name' => 'Sports Screening', 'icon' => 'tv'],
            ['name' => 'Live DJ', 'icon' => 'disc-3'],
        ];

        foreach ($facilities as $facility) {
            VenueFacility::query()->updateOrCreate(
                ['slug' => Str::slug($facility['name'])],
                [
                    'name' => $facility['name'],
                    'icon' => $facility['icon'],
                ],
            );
        }
    }
}
