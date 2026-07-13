<?php

namespace Database\Seeders;

use App\Models\CuisineType;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CuisineTypeSeeder extends Seeder
{
    public function run(): void
    {
        $cuisines = [
            'Italian',
            'Steakhouse',
            'Seafood',
            'Pizza',
            'Sushi',
            'Mediterranean',
            'Traditional',
            'Fast Food',
            'Coffee & Desserts',
            'Vegan',
            'Vegetarian',
            'Asian',
            'Mexican',
            'International',
        ];

        foreach ($cuisines as $cuisine) {
            CuisineType::query()->updateOrCreate(
                ['slug' => Str::slug($cuisine)],
                ['name' => $cuisine],
            );
        }
    }
}
