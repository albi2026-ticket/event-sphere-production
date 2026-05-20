<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreEventImageRequest;
use App\Http\Requests\Api\UpdateEventImageRequest;
use App\Http\Resources\EventImageResource;
use App\Models\Event;
use App\Models\EventImage;
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
        $payload = $this->imagePayload($request, $event);

        if ($request->boolean('is_primary')) {
            $event->images()->update(['is_primary' => false]);
        }

        $image = $event->images()->create($payload);
        $this->syncEventBanner($image);

        return new EventImageResource($image);
    }

    public function update(UpdateEventImageRequest $request, EventImage $eventImage): EventImageResource
    {
        $payload = $request->safe()->except(['image']);

        if ($request->hasFile('image')) {
            $this->deleteStoredFile($eventImage);
            $payload = array_merge($payload, $this->storedFilePayload($request->file('image'), $eventImage->event));
        } elseif ($request->filled('url')) {
            $this->deleteStoredFile($eventImage);
            $payload = array_merge($payload, [
                'disk' => null,
                'path' => null,
                'url' => $request->string('url')->toString(),
                'original_name' => null,
                'mime_type' => null,
                'size' => null,
                'width' => null,
                'height' => null,
            ]);
        }

        if ($request->boolean('is_primary')) {
            $eventImage->event->images()->whereKeyNot($eventImage->id)->update(['is_primary' => false]);
        }

        $eventImage->update($payload);
        $this->syncEventBanner($eventImage->fresh());

        return new EventImageResource($eventImage->fresh());
    }

    public function destroy(Request $request, EventImage $eventImage): JsonResponse
    {
        abort_unless($request->user()?->canManageEvent($eventImage->event), 403);

        $this->deleteStoredFile($eventImage);
        $event = $eventImage->event;
        $wasBanner = $event->banner_image_url === $eventImage->url;

        $eventImage->delete();

        if ($wasBanner) {
            $replacement = $event->images()->where('is_primary', true)->first()
                ?? $event->images()->orderBy('sort_order')->first();

            $event->update(['banner_image_url' => $replacement?->url]);
        }

        return response()->json(['message' => 'Event image deleted.']);
    }

    protected function imagePayload(StoreEventImageRequest $request, Event $event): array
    {
        if ($request->hasFile('image')) {
            return array_merge($this->storedFilePayload($request->file('image'), $event), [
                'alt_text' => $request->input('alt_text'),
                'type' => $request->input('type', 'gallery'),
                'sort_order' => $request->integer('sort_order', 0),
                'is_primary' => $request->boolean('is_primary'),
            ]);
        }

        return [
            'disk' => null,
            'path' => null,
            'url' => $request->string('url')->toString(),
            'original_name' => null,
            'mime_type' => null,
            'size' => null,
            'width' => null,
            'height' => null,
            'alt_text' => $request->input('alt_text'),
            'type' => $request->input('type', 'gallery'),
            'sort_order' => $request->integer('sort_order', 0),
            'is_primary' => $request->boolean('is_primary'),
        ];
    }

    protected function storedFilePayload(UploadedFile $file, Event $event): array
    {
        $disk = config('filesystems.event_images_disk', 'public');
        $path = $file->store("event-images/{$event->id}", $disk);
        [$width, $height] = @getimagesize($file->getRealPath()) ?: [null, null];

        return [
            'disk' => $disk,
            'path' => $path,
            'url' => Storage::disk($disk)->url($path),
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
            Storage::disk($eventImage->disk)->delete($eventImage->path);
        }
    }

    protected function syncEventBanner(EventImage $eventImage): void
    {
        if ($eventImage->is_primary || $eventImage->type === 'banner') {
            $eventImage->event->update(['banner_image_url' => $eventImage->url]);
        }
    }
}
