<?php

namespace App\Http\Requests\Api\Tickets;

class CheckInTicketRequest extends ValidateTicketRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return array_merge(parent::rules(), [
            'method' => ['nullable', 'string', 'in:manual,qr,mobile_scanner,kiosk'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);
    }
}
