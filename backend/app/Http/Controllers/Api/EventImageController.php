<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreEventImageRequest;
use App\Http\Requests\Api\UpdateEventImageRequest;
use App\Http\Resources\EventImageResource;
use App\Models\Event;
use App\Models\EventImage;
use App\Services\Storage\PublicStorageUrl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class EventImageController extends Controller
{
    public function index(Event $event): AnonymousResourceCollection
    {
        abort_unless($event->status === 'published' && $event->visibility === 'public', 404);

        return EventImageResource::collection(
            $event->images()->orderBy('sort_order')->orderBy('id')->get()
        );
    }

    public function show(EventImage $eventImage): EventImageResource
    {
        abort_unless(
            $eventImage->event->status === 'published' && $eventImage->event->visibility === 'public',
            404
        );

        return new EventImageResource($eventImage);
    }

    public function store(StoreEventImageRequest $request, Event $event): EventImageResource
    {
        $isFirstImage = ! $event->images()->exists();
        $payload = $this->imagePayload($request, $event);
        $payload['is_primary'] = $request->boolean('is_primary') || $isFirstImage;
        $payload['is_banner'] = $request->boolean('is_banner')
            || $request->input('type') === 'banner'
            || $isFirstImage;
        $payload['type'] = $payload['is_banner'] ? 'banner' : ($payload['type'] ?? 'gallery');

        if ($payload['is_primary']) {
            $event->images()->update(['is_primary' => false]);
        }

        if ($payload['is_banner']) {
            $event->images()->update(['is_banner' => false]);
        }

        $image = $event->images()->create($payload);
        $this->normalizeEventImageRoles($event);

        return new EventImageResource($image->fresh());
    }

    public function update(UpdateEventImageRequest $request, EventImage $eventImage): EventImageResource
    {
        $payload = $request->safe()->except(['image']);

        if ($request->hasFile('image')) {
            $this->deleteStoredFile($eventImage);
            $payload = array_merge($payload, $this->storedFilePayload($request->file('image'), $eventImage->event));
        }

        if ($request->boolean('is_primary')) {
            $payload['is_primary'] = true;
            $eventImage->event->images()->whereKeyNot($eventImage->id)->update(['is_primary' => false]);
        }

        if ($request->boolean('is_banner') || $request->input('type') === 'banner') {
            $payload['is_banner'] = true;
            $payload['type'] = 'banner';
            $eventImage->event->images()->whereKeyNot($eventImage->id)->update(['is_banner' => false]);
        }

        $eventImage->update($payload);
        $this->normalizeEventImageRoles($eventImage->event);

        return new EventImageResource($eventImage->fresh());
    }

    public function destroy(Request $request, EventImage $eventImage): JsonResponse
    {
        abort_unless($request->user()?->canManageEvent($eventImage->event), 403);

        $this->deleteStoredFile($eventImage);
        $event = $eventImage->event;

        $eventImage->delete();
        $this->normalizeEventImageRoles($event);

        return response()->json(['message' => 'Event image deleted.']);
    }

    protected function imagePayload(StoreEventImageRequest $request, Event $event): array
    {
        if ($request->hasFile('image')) {
            return array_merge($this->storedFilePayload($request->file('image'), $event), [
                'alt_text' => $request->input('alt_text'),
                'type' => $request->input('type', 'gallery'),
                'sort_order' => $request->integer('sort_order', 0),
            ]);
        }

        abort(422, 'Image upload is required.');
    }

    protected function storedFilePayload(UploadedFile $file, Event $event): array
    {
        $disk = config('filesystems.event_images_disk', 'public');

        if ($disk === 'supabase') {
            $bucket = $this->eventImagesBucket();
            $storedPath = app(PublicStorageUrl::class)
                ->diskForBucket($bucket)
                ->putFile((string) $event->id, $file, ['visibility' => 'public']);

            abort_unless($storedPath, 500, 'Event image upload failed.');

            $path = trim($bucket.'/'.$storedPath, '/');
        } else {
            $path = $file->store("event-images/{$event->id}", $disk);
        }

        [$width, $height] = @getimagesize($file->getRealPath()) ?: [null, null];

        return [
            'disk' => $disk,
            'path' => $path,
            'url' => null,
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
            'width' => $width,
            'height' => $height,
        ];
    }

    protected function deleteStoredFile(EventImage $eventImage): void
    {
        if ($eventImage->disk && $eventImage->path) {
            if ($eventImage->disk === 'public' && app(PublicStorageUrl::class)->hasSupabasePublicUrl()) {
                app(PublicStorageUrl::class)
                    ->diskForPath($eventImage->path, $this->eventImagesBucket())
                    ->delete(app(PublicStorageUrl::class)->objectPath($eventImage->path, $this->eventImagesBucket()));

                return;
            }

            if ($eventImage->disk === 'supabase') {
                app(PublicStorageUrl::class)
                    ->diskForPath($eventImage->path, $this->eventImagesBucket())
                    ->delete(app(PublicStorageUrl::class)->objectPath($eventImage->path, $this->eventImagesBucket()));

                return;
            }

            Storage::disk($eventImage->disk)->delete($eventImage->path);
        }
    }

    protected function eventImagesBucket(): string
    {
        return trim((string) config('services.supabase.event_images_bucket', 'event-images'), '/');
    }

    protected function normalizeEventImageRoles(Event $event): void
    {
        $images = $event->images()->get()->sortBy([
            ['sort_order', 'asc'],
            ['id', 'asc'],
        ])->values();

        if ($images->isEmpty()) {
            $event->update(['banner_image_url' => null]);

            return;
        }

        $primary = $images->firstWhere('is_primary', true) ?? $images->first();
        $banner = $images->firstWhere('is_banner', true)
            ?? $images->firstWhere('type', 'banner')
            ?? $primary;

        $event->images()->whereKeyNot($primary->id)->update(['is_primary' => false]);
        $event->images()->whereKey($primary->id)->update(['is_primary' => true]);
        $event->images()->whereKeyNot($banner->id)->update(['is_banner' => false]);
        $event->images()->whereKey($banner->id)->update([
            'is_banner' => true,
            'type' => 'banner',
        ]);

        $event->update(['banner_image_url' => $banner->fresh()?->publicUrl()]);
    }
}
