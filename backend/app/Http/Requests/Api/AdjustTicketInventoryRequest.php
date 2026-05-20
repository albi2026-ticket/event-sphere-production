<?php

namespace App\Http\Requests\Api;

use App\Models\TicketType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AdjustTicketInventoryRequest extends FormRequest
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
            'quantity_total' => ['required_without:status', 'integer', 'min:0'],
            'status' => ['sometimes', Rule::in([
                TicketType::STATUS_ACTIVE,
                TicketType::STATUS_INACTIVE,
                TicketType::STATUS_PAUSED,
                TicketType::STATUS_SOLD_OUT,
            ])],
        ];
    }
}
