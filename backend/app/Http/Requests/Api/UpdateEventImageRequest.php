<?php

namespace App\Http\Requests\Api;

use App\Models\EventImage;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEventImageRequest extends FormRequest
{
    public function authorize(): bool
    {
        $image = $this->route('eventImage');

        return $image instanceof EventImage && $this->user()?->canManageEvent($image->event);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'alt_text' => ['nullable', 'string', 'max:255'],
            'type' => ['sometimes', Rule::in(['banner', 'card', 'gallery', 'thumbnail'])],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'is_primary' => ['sometimes', 'boolean'],
        ];
    }
}
