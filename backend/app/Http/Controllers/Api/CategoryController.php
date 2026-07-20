<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EventCategory;
use App\Support\Performance\DeepControllerProfiler as Profiler;
use Illuminate\Http\JsonResponse;

class CategoryController extends Controller
{
    public function index(): JsonResponse
    {
        Profiler::begin('CategoryController');

        $categories = Profiler::section('Category::query get active categories', fn () => EventCategory::query()
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get());

        Profiler::section('Category Collection count', fn (): int => $categories->count());

        return Profiler::section('Return response()->json', fn (): JsonResponse => response()->json([
            'data' => $categories,
        ]));
    }
}
