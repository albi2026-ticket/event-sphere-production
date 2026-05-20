<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function user(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'data' => [
                'role' => $user->role,
                'orders_count' => $user->orders()->count(),
                'tickets_count' => $user->tickets()->count(),
                'favorites_count' => $user->favorites()->count(),
                'reviews_count' => $user->reviews()->count(),
            ],
        ]);
    }

    public function organizer(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'data' => [
                'role' => $user->role,
                'organizer_status' => $user->organizer_status,
                'events_count' => $user->organizedEvents()->count(),
                'published_events_count' => $user->organizedEvents()->where('status', 'published')->count(),
            ],
        ]);
    }

    public function admin(): JsonResponse
    {
        return response()->json([
            'data' => [
                'scope' => 'platform',
                'message' => 'Admin dashboard API access granted.',
            ],
        ]);
    }
}
