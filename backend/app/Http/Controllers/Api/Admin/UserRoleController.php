<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class UserRoleController extends Controller
{
    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'role' => ['required', Rule::in([User::ROLE_USER, User::ROLE_ORGANIZER, User::ROLE_ADMIN])],
            'status' => ['sometimes', Rule::in([User::STATUS_ACTIVE, User::STATUS_SUSPENDED, User::STATUS_BANNED])],
        ]);

        if ($request->user()->is($user) && ($validated['role'] !== User::ROLE_ADMIN || ($validated['status'] ?? $user->status) !== User::STATUS_ACTIVE)) {
            throw ValidationException::withMessages([
                'user' => 'You cannot remove your own active admin access.',
            ]);
        }

        $user->fill($validated);

        if ($validated['role'] !== User::ROLE_ORGANIZER) {
            $user->organizer_status = User::ORGANIZER_STATUS_NONE;
            $user->organizer_approved_at = null;
            $user->organizer_approved_by = null;
        }

        $user->save();

        return response()->json(['data' => $user->fresh()]);
    }

    public function approveOrganizer(Request $request, User $user): JsonResponse
    {
        $user->forceFill([
            'role' => User::ROLE_ORGANIZER,
            'organizer_status' => User::ORGANIZER_STATUS_APPROVED,
            'organizer_approved_at' => now(),
            'organizer_approved_by' => $request->user()->id,
        ])->save();

        return response()->json(['data' => $user->fresh()]);
    }

    public function rejectOrganizer(Request $request, User $user): JsonResponse
    {
        $request->validate([
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $user->forceFill([
            'role' => User::ROLE_USER,
            'organizer_status' => User::ORGANIZER_STATUS_REJECTED,
            'organizer_approved_at' => null,
            'organizer_approved_by' => $request->user()->id,
        ])->save();

        return response()->json(['data' => $user->fresh()]);
    }

    public function suspend(Request $request, User $user): JsonResponse
    {
        if ($request->user()->is($user)) {
            throw ValidationException::withMessages([
                'user' => 'You cannot suspend your own admin account.',
            ]);
        }

        $user->forceFill(['status' => User::STATUS_SUSPENDED])->save();

        return response()->json(['data' => $user->fresh()]);
    }

    public function reactivate(User $user): JsonResponse
    {
        $user->forceFill(['status' => User::STATUS_ACTIVE])->save();

        return response()->json(['data' => $user->fresh()]);
    }
}
