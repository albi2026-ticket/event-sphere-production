<?php

namespace App\Http\Requests\Api\Organizer;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class OrganizerDashboardRequest extends FormRequest
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
            'event_id' => ['nullable', 'integer', 'exists:events,id'],
            'status' => ['nullable', 'string', 'max:50'],
            'payment_status' => ['nullable', 'string', 'max:50'],
            'ticket_status' => ['nullable', 'string', 'max:50'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'search' => ['nullable', 'string', 'max:255'],
            'sort' => ['nullable', 'string', Rule::in([
                'created_at',
                '-created_at',
                'starts_at',
                '-starts_at',
                'revenue',
                '-revenue',
                'tickets_sold',
                '-tickets_sold',
            ])],
            'group_by' => ['nullable', 'string', Rule::in(['day', 'week', 'month'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }

    public function perPage(int $default = 15): int
    {
        return min((int) $this->integer('per_page', $default), 100);
    }

    /**
     * @return array{0: string, 1: string}
     */
    public function sort(string $defaultColumn = 'created_at', string $defaultDirection = 'desc'): array
    {
        $sort = (string) $this->input('sort', '');

        if ($sort === '') {
            return [$defaultColumn, $defaultDirection];
        }

        return str_starts_with($sort, '-')
            ? [substr($sort, 1), 'desc']
            : [$sort, 'asc'];
    }
}
