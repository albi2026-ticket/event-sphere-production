<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\EventCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminCategoryController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => EventCategory::query()
                ->withCount('events')
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:event_categories,name'],
            'slug' => ['nullable', 'string', 'max:255', 'unique:event_categories,slug'],
            'icon' => ['nullable', 'string', 'max:80'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $category = EventCategory::query()->create([
            'name' => $validated['name'],
            'slug' => $validated['slug'] ?? Str::slug($validated['name']),
            'icon' => $validated['icon'] ?? 'bi-tag',
            'is_active' => $validated['is_active'] ?? true,
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        AuditLog::record($request->user(), 'category.created', $category, ['name' => $category->name], $request->ip());

        return response()->json(['data' => $category], 201);
    }

    public function update(Request $request, EventCategory $category): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255', Rule::unique('event_categories', 'name')->ignore($category->id)],
            'slug' => ['sometimes', 'string', 'max:255', Rule::unique('event_categories', 'slug')->ignore($category->id)],
            'icon' => ['nullable', 'string', 'max:80'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        if (isset($validated['name']) && ! isset($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['name']);
        }

        $category->update($validated);
        AuditLog::record($request->user(), 'category.updated', $category, $validated, $request->ip());

        return response()->json(['data' => $category->fresh()]);
    }

    public function destroy(Request $request, EventCategory $category): JsonResponse
    {
        $eventsCount = $category->events()->count();
        abort_if($eventsCount > 0, 422, 'Categories assigned to events cannot be deleted. Disable the category or move events first.');

        AuditLog::record($request->user(), 'category.deleted', $category, ['name' => $category->name], $request->ip());
        $category->delete();

        return response()->json(['message' => 'Category deleted.']);
    }
}
