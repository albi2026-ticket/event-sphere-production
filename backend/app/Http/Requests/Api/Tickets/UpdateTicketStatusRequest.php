<?php

namespace App\Http\Requests\Api\Tickets;

use App\Models\Ticket;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTicketStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'status' => ['required', 'string', Rule::in([
                Ticket::STATUS_ACTIVE,
                Ticket::STATUS_USED,
                Ticket::STATUS_CANCELLED,
                Ticket::STATUS_REFUNDED,
            ])],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
