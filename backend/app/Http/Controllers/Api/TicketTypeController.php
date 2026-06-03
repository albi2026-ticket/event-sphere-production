<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\AdjustTicketInventoryRequest;
use App\Http\Requests\Api\ReserveTicketInventoryRequest;
use App\Http\Requests\Api\StoreTicketTypeRequest;
use App\Http\Requests\Api\UpdateTicketTypeRequest;
use App\Http\Resources\TicketTypeResource;
use App\Models\Event;
use App\Models\TicketType;
use App\Services\Tickets\TicketInventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\ValidationException;

class TicketTypeController extends Controller
{
    public function __construct(private readonly TicketInventoryService $inventory)
    {
    }

    public function index(Event $event): AnonymousResourceCollection
    {
        abort_unless($event->status === 'published' && $event->visibility === 'public', 404);

        return TicketTypeResource::collection(
            $event->ticketTypes()
                ->whereIn('status', [TicketType::STATUS_ACTIVE, TicketType::STATUS_SOLD_OUT])
                ->orderBy('sort_order')
                ->orderBy('price')
                ->get()
        );
    }

    public function show(TicketType $ticketType): TicketTypeResource
    {
        abort_unless(
            $ticketType->event->status === 'published'
            && $ticketType->event->visibility === 'public'
            && $ticketType->status !== TicketType::STATUS_INACTIVE,
            404
        );

        return new TicketTypeResource($ticketType);
    }

    public function store(StoreTicketTypeRequest $request, Event $event): TicketTypeResource
    {
        $payload = $request->validated();
        $payload['currency'] = strtoupper($payload['currency'] ?? $event->currency ?? 'USD');
        $payload['status'] = $payload['status'] ?? TicketType::STATUS_ACTIVE;
        $payload['quantity_sold'] = 0;
        $payload['quantity_reserved'] = 0;

        $ticketType = $event->ticketTypes()->create($payload);
        $this->syncEventBasePrice($event);

        return new TicketTypeResource($ticketType);
    }

    public function update(UpdateTicketTypeRequest $request, TicketType $ticketType): TicketTypeResource
    {
        $payload = $request->validated();
        $this->ensurePublishedEventKeepsInventory($ticketType, $payload);

        if (isset($payload['currency'])) {
            $payload['currency'] = strtoupper($payload['currency']);
        }

        if (array_key_exists('quantity_total', $payload)) {
            $ticketType = $this->inventory->adjustTotal(
                $ticketType,
                (int) $payload['quantity_total'],
                $payload['status'] ?? null
            );

            unset($payload['quantity_total'], $payload['status']);
        }

        if ($payload !== []) {
            $ticketType->update($payload);
            $ticketType = $ticketType->fresh();
        }

        $this->syncEventBasePrice($ticketType->event);

        return new TicketTypeResource($ticketType);
    }

    public function destroy(Request $request, TicketType $ticketType): JsonResponse
    {
        abort_unless($request->user()?->canManageEvent($ticketType->event), 403);
        abort_if($ticketType->quantity_sold > 0, 422, 'Ticket types with sold tickets cannot be deleted.');
        $this->ensurePublishedEventKeepsInventory($ticketType, ['status' => TicketType::STATUS_INACTIVE, 'quantity_total' => 0]);

        $event = $ticketType->event;
        $ticketType->delete();
        $this->syncEventBasePrice($event);

        return response()->json(['message' => 'Ticket type deleted.']);
    }

    public function adjustInventory(AdjustTicketInventoryRequest $request, TicketType $ticketType): TicketTypeResource
    {
        $this->ensurePublishedEventKeepsInventory($ticketType, $request->validated());

        $ticketType = $this->inventory->adjustTotal(
            $ticketType,
            (int) $request->integer('quantity_total', $ticketType->quantity_total),
            $request->input('status')
        );

        $this->syncEventBasePrice($ticketType->event);

        return new TicketTypeResource($ticketType);
    }

    /**
     * @param  array<string, mixed>  $changes
     */
    protected function ensurePublishedEventKeepsInventory(TicketType $ticketType, array $changes): void
    {
        $event = $ticketType->event;

        if ($event->status !== 'published') {
            return;
        }

        $nextStatus = $changes['status'] ?? $ticketType->status;
        $nextTotal = array_key_exists('quantity_total', $changes)
            ? (int) $changes['quantity_total']
            : $ticketType->quantity_total;

        $inventoryKeepingStatuses = [TicketType::STATUS_ACTIVE, TicketType::STATUS_SOLD_OUT];
        $thisTierWillKeepInventory = in_array($nextStatus, $inventoryKeepingStatuses, true) && $nextTotal > 0;

        if ($thisTierWillKeepInventory) {
            return;
        }

        $hasOtherActiveInventory = $event->ticketTypes()
            ->whereKeyNot($ticketType->id)
            ->whereIn('status', $inventoryKeepingStatuses)
            ->where('quantity_total', '>', 0)
            ->exists();

        if (! $hasOtherActiveInventory) {
            throw ValidationException::withMessages([
                'ticket_types' => 'Published events must keep at least one active ticket tier with inventory.',
            ]);
        }
    }

    public function reserve(ReserveTicketInventoryRequest $request, TicketType $ticketType): TicketTypeResource
    {
        $ticketType = $this->inventory->reserve($ticketType, $request->integer('quantity'));

        return new TicketTypeResource($ticketType);
    }

    protected function syncEventBasePrice(Event $event): void
    {
        $lowest = $event->ticketTypes()
            ->whereIn('status', [TicketType::STATUS_ACTIVE, TicketType::STATUS_SOLD_OUT])
            ->orderBy('price')
            ->first();

        $event->update([
            'base_price' => $lowest?->price,
            'currency' => $lowest?->currency ?? $event->currency,
        ]);
    }
}
