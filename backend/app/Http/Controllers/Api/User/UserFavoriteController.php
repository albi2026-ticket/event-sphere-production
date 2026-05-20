<?php

namespace App\Http\Controllers\Api\User;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Dashboard\DashboardListRequest;
use App\Http\Requests\Api\Favorites\StoreFavoriteRequest;
use App\Http\Resources\FavoriteResource;
use App\Models\Event;
use App\Models\Favorite;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class UserFavoriteController extends Controller
{
    public function index(DashboardListRequest $request): AnonymousResourceCollection
    {
        [$sortColumn, $sortDirection] = $request->sort('created_at', 'desc');
        $sortColumn = in_array($sortColumn, ['created_at', 'starts_at'], true) ? $sortColumn : 'created_at';

        return FavoriteResource::collection(
            $request->user()
                ->favorites()
                ->with(['event.images', 'event.organizer'])
                ->whereHas('event', function ($query) use ($request): void {
                    $query->where('status', 'published')
                        ->where('visibility', 'public')
                        ->when($request->filled('category'), fn ($eventQuery) => $eventQuery->where('category', $request->input('category')))
                        ->when($request->filled('city'), fn ($eventQuery) => $eventQuery->where('city', $request->input('city')))
                        ->when($request->boolean('upcoming'), fn ($eventQuery) => $eventQuery->where('starts_at', '>=', now()))
                        ->when($request->filled('search'), fn ($eventQuery) => $eventQuery->where('title', 'like', '%'.$request->input('search').'%'));
                })
                ->when($sortColumn === 'starts_at', fn ($query) => $query->orderBy(
                    Event::query()->select('starts_at')->whereColumn('events.id', 'favorites.event_id'),
                    $sortDirection
                ), fn ($query) => $query->orderBy($sortColumn, $sortDirection))
                ->paginate($request->perPage())
        );
    }

    public function store(StoreFavoriteRequest $request): FavoriteResource
    {
        $event = Event::query()
            ->whereKey($request->integer('event_id'))
            ->where('status', 'published')
            ->where('visibility', 'public')
            ->firstOrFail();

        $favorite = Favorite::query()->firstOrCreate([
            'user_id' => $request->user()->id,
            'event_id' => $event->id,
        ]);

        return new FavoriteResource($favorite->load(['event.images', 'event.organizer']));
    }

    public function destroy(Request $request, Event $event): JsonResponse
    {
        Favorite::query()
            ->where('user_id', $request->user()->id)
            ->where('event_id', $event->id)
            ->delete();

        return response()->json(['message' => 'Favorite removed.']);
    }

    public function toggle(StoreFavoriteRequest $request): JsonResponse
    {
        Event::query()
            ->whereKey($request->integer('event_id'))
            ->where('status', 'published')
            ->where('visibility', 'public')
            ->firstOrFail();

        $favorite = Favorite::query()
            ->where('user_id', $request->user()->id)
            ->where('event_id', $request->integer('event_id'))
            ->first();

        if ($favorite) {
            $favorite->delete();

            return response()->json([
                'data' => [
                    'event_id' => $request->integer('event_id'),
                    'is_favorited' => false,
                ],
            ]);
        }

        $favorite = Favorite::query()->create([
            'user_id' => $request->user()->id,
            'event_id' => $request->integer('event_id'),
        ]);

        return response()->json([
            'data' => [
                'event_id' => $favorite->event_id,
                'is_favorited' => true,
                'favorite' => new FavoriteResource($favorite->load(['event.images', 'event.organizer'])),
            ],
        ], 201);
    }
}
