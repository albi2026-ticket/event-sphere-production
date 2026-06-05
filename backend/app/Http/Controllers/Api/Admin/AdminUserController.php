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
            'email_verification' => ['nullable', Rule::in(['verified', 'unverified'])],
            'sort' => ['nullable', Rule::in([
                'newest',
                'oldest',
                'verification_status',
                '-verification_status',
                'email_verified_at',
                '-email_verified_at',
            ])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $sort = $validated['sort'] ?? 'newest';

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
            ->when(($validated['email_verification'] ?? null) === 'verified', fn ($query) => $query->whereNotNull('email_verified_at'))
            ->when(($validated['email_verification'] ?? null) === 'unverified', fn ($query) => $query->whereNull('email_verified_at'))
            ->when($sort === 'oldest', fn ($query) => $query->oldest())
            ->when($sort === 'newest', fn ($query) => $query->latest())
            ->when($sort === 'verification_status', fn ($query) => $query
                ->orderByRaw('email_verified_at IS NULL ASC')
                ->latest())
            ->when($sort === '-verification_status', fn ($query) => $query
                ->orderByRaw('email_verified_at IS NULL DESC')
                ->latest())
            ->when($sort === 'email_verified_at', fn ($query) => $query
                ->orderByRaw('email_verified_at IS NULL ASC')
                ->orderBy('email_verified_at')
                ->latest())
            ->when($sort === '-email_verified_at', fn ($query) => $query
                ->orderByRaw('email_verified_at IS NULL ASC')
                ->orderByDesc('email_verified_at')
                ->latest())
            ->paginate((int) ($validated['per_page'] ?? 25));

        return response()->json($users);
    }

    public function show(User $user): JsonResponse
    {
        $user->loadCount(['orders', 'organizedEvents', 'tickets', 'favorites', 'reviews']);
        $user->load([
            'orders' => fn ($query) => $query
                ->select('id', 'user_id', 'order_number', 'status', 'payment_status', 'total', 'currency', 'created_at')
                ->latest()
                ->limit(5),
            'organizedEvents' => fn ($query) => $query
                ->select('id', 'organizer_id', 'title', 'status', 'starts_at', 'city', 'created_at')
                ->latest()
                ->limit(5),
        ]);

        return response()->json(['data' => $user]);
    }
}
