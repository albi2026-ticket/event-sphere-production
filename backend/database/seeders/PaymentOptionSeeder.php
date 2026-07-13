<?php

namespace Database\Seeders;

use App\Models\PaymentOption;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class PaymentOptionSeeder extends Seeder
{
    public function run(): void
    {
        $options = [
            'Cash',
            'Credit Card',
            'Debit Card',
            'Apple Pay',
            'Google Pay',
            'Bank Transfer',
        ];

        foreach ($options as $option) {
            PaymentOption::query()->updateOrCreate(
                ['slug' => Str::slug($option)],
                ['name' => $option],
            );
        }
    }
}
