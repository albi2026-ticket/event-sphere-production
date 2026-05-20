<?php

namespace App\Http\Requests\Api\Payments;

use Illuminate\Foundation\Http\FormRequest;

class RefundPaymentRequest extends FormRequest
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
            'amount' => ['nullable', 'numeric', 'min:0.5'],
            'reason' => ['nullable', 'string', 'in:duplicate,fraudulent,requested_by_customer'],
        ];
    }
}
