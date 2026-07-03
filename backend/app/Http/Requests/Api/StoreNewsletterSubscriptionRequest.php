<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreNewsletterSubscriptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'email:rfc', 'max:255'],
            'source' => ['nullable', Rule::in(['events', 'restaurants', 'homepage'])],
            'language' => ['nullable', Rule::in(['en', 'sq'])],
        ];
    }
}
