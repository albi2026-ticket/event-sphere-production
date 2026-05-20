<?php

namespace App\Http\Requests\Api;

use App\Models\TicketType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTicketTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        $ticketType = $this->route('ticketType');

        return $ticketType instanceof TicketType && $this->user()?->canManageEvent($ticketType->event);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'price' => ['sometimes', 'numeric', 'min:0'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'quantity_total' => ['sometimes', 'integer', 'min:0'],
            'quantity_reserved' => ['sometimes', 'integer', 'min:0'],
            'min_per_order' => ['sometimes', 'integer', 'min:1'],
            'max_per_order' => ['sometimes', 'integer', 'min:1', 'gte:min_per_order'],
            'sale_starts_at' => ['nullable', 'date'],
            'sale_ends_at' => ['nullable', 'date', 'after:sale_starts_at'],
            'status' => ['sometimes', Rule::in(['active', 'paused', 'sold_out'])],
            'is_vip' => ['sometimes', 'boolean'],
            'is_resale_allowed' => ['sometimes', 'boolean'],
        ];
    }
}
