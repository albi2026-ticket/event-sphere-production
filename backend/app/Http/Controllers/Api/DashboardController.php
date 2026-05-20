<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Dashboard\UserDashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(private readonly UserDashboardService $userDashboard) {}

    public function user(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->userDashboard->summary($request->user()),
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
