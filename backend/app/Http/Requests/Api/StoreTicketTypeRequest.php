<?php

namespace App\Http\Requests\Api;

use App\Models\Event;
use App\Models\TicketType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTicketTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        $event = $this->route('event');

        return $event instanceof Event && $this->user()?->canManageEvent($event);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'price' => ['required', 'numeric', 'min:0'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'quantity_total' => ['required', 'integer', 'min:0'],
            'min_per_order' => ['sometimes', 'integer', 'min:1'],
            'max_per_order' => ['sometimes', 'integer', 'min:1', 'gte:min_per_order'],
            'sale_starts_at' => ['nullable', 'date'],
            'sale_ends_at' => ['nullable', 'date', 'after:sale_starts_at'],
            'status' => ['sometimes', Rule::in([
                TicketType::STATUS_ACTIVE,
                TicketType::STATUS_INACTIVE,
                TicketType::STATUS_PAUSED,
                TicketType::STATUS_SOLD_OUT,
            ])],
            'is_vip' => ['sometimes', 'boolean'],
            'is_resale_allowed' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ];
    }
}
