<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminAuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:255'],
            'action' => ['nullable', 'string', 'max:255'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $logs = AuditLog::query()
            ->with('user:id,name,email')
            ->when($validated['q'] ?? null, function ($query, string $search): void {
                $needle = '%'.mb_strtolower($search).'%';
                $query->where(function ($query) use ($needle): void {
                    $query
                        ->whereRaw('LOWER(action) LIKE ?', [$needle])
                        ->orWhereRaw('LOWER(auditable_type) LIKE ?', [$needle])
                        ->orWhereHas('user', fn ($userQuery) => $userQuery
                            ->whereRaw('LOWER(name) LIKE ?', [$needle])
                            ->orWhereRaw('LOWER(email) LIKE ?', [$needle]));
                });
            })
            ->when($validated['action'] ?? null, fn ($query, string $action) => $query->where('action', $action))
            ->latest()
            ->paginate((int) ($validated['per_page'] ?? 25));

        return response()->json($logs);
    }
}
