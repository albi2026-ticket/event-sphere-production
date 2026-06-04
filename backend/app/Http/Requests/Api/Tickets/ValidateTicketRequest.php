<?php

namespace App\Http\Requests\Api\Tickets;

use Illuminate\Foundation\Http\FormRequest;

class ValidateTicketRequest extends FormRequest
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
            'token' => ['required_without:ticket_code', 'nullable', 'string', 'max:255'],
            'ticket_uuid' => ['nullable', 'uuid'],
            'ticket_code' => ['required_without:token', 'nullable', 'string', 'max:255'],
            'event_id' => ['nullable', 'integer', 'exists:events,id'],
            'method' => ['nullable', 'string', 'in:manual,qr,mobile_scanner,kiosk'],
        ];
    }
}
