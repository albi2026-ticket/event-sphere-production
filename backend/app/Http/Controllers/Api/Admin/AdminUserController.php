<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminUserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:255'],
            'role' => ['nullable', Rule::in([User::ROLE_USER, User::ROLE_ORGANIZER, User::ROLE_ADMIN])],
            'status' => ['nullable', Rule::in([User::STATUS_ACTIVE, User::STATUS_SUSPENDED, User::STATUS_BANNED])],
            'organizer_status' => ['nullable', Rule::in([
                User::ORGANIZER_STATUS_NONE,
                User::ORGANIZER_STATUS_PENDING,
                User::ORGANIZER_STATUS_APPROVED,
                User::ORGANIZER_STATUS_REJECTED,
            ])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $users = User::query()
            ->withCount(['orders', 'organizedEvents'])
            ->when($validated['q'] ?? null, function ($query, string $search): void {
                $needle = '%'.mb_strtolower($search).'%';

                $query->where(function ($query) use ($needle): void {
                    $query
                        ->whereRaw('LOWER(name) LIKE ?', [$needle])
                        ->orWhereRaw('LOWER(email) LIKE ?', [$needle]);
                });
            })
            ->when($validated['role'] ?? null, fn ($query, string $role) => $query->where('role', $role))
            ->when($validated['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->when($validated['organizer_status'] ?? null, fn ($query, string $status) => $query->where('organizer_status', $status))
            ->latest()
            ->paginate((int) ($validated['per_page'] ?? 25));

        return response()->json($users);
    }
}
