<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CuisineTypeResource;
use App\Http\Resources\PaymentOptionResource;
use App\Http\Resources\VenueFacilityResource;
use App\Models\CuisineType;
use App\Models\PaymentOption;
use App\Models\VenueFacility;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class VenueLookupController extends Controller
{
    public function facilities(): AnonymousResourceCollection
    {
        return VenueFacilityResource::collection(VenueFacility::query()->orderBy('name')->get());
    }

    public function cuisineTypes(): AnonymousResourceCollection
    {
        return CuisineTypeResource::collection(CuisineType::query()->orderBy('name')->get());
    }

    public function paymentOptions(): AnonymousResourceCollection
    {
        return PaymentOptionResource::collection(PaymentOption::query()->orderBy('name')->get());
    }
}
