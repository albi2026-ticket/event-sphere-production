<?php

namespace App\Http\Requests\Api;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user();
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'items' => ['required', 'array', 'min:1'],
            'items.*.ticket_type_id' => ['required', 'integer', 'exists:ticket_types,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:10'],
            'billing_email' => ['required', 'string', 'email', 'max:255'],
            'billing_phone' => ['nullable', 'string', 'max:255'],
            'billing_first_name' => ['required', 'string', 'max:255'],
            'billing_last_name' => ['required', 'string', 'max:255'],
            'billing_address' => ['nullable', 'string', 'max:500'],
            'billing_city' => ['nullable', 'string', 'max:255'],
            'billing_state' => ['nullable', 'string', 'max:255'],
            'billing_zip' => ['nullable', 'string', 'max:32'],
            'billing_country' => ['nullable', 'string', 'max:255'],
            'refund_protection' => ['sometimes', 'boolean'],
            'promo_code' => ['nullable', 'string', 'max:64'],
        ];
    }
}
