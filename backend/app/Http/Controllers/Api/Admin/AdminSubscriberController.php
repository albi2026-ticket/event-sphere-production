<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\NewsletterSubscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminSubscriberController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate($this->rules());

        $subscribers = $this->query($validated)
            ->orderByDesc('subscribed_at')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 25));

        return response()->json([
            'data' => [
                'subscribers' => $subscribers->through(fn (NewsletterSubscription $subscription): array => $this->row($subscription))->items(),
                'meta' => [
                    'current_page' => $subscribers->currentPage(),
                    'last_page' => $subscribers->lastPage(),
                    'per_page' => $subscribers->perPage(),
                    'total' => $subscribers->total(),
                ],
                'summary' => $this->summary(),
            ],
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $validated = $request->validate($this->rules());
        $filename = 'tiketa-subscribers-'.now()->format('Ymd-His').'.csv';

        return response()->streamDownload(function () use ($validated): void {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['ID', 'Email', 'Source', 'Language', 'Status', 'Subscribed At', 'Unsubscribed At', 'Created At']);

            $this->query($validated)
                ->orderByDesc('subscribed_at')
                ->orderByDesc('id')
                ->chunk(500, function ($subscriptions) use ($out): void {
                    foreach ($subscriptions as $subscription) {
                        fputcsv($out, [
                            $subscription->id,
                            $subscription->email,
                            $subscription->source,
                            $subscription->language,
                            $subscription->status,
                            $subscription->subscribed_at?->toISOString(),
                            $subscription->unsubscribed_at?->toISOString(),
                            $subscription->created_at?->toISOString(),
                        ]);
                    }
                });

            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(): array
    {
        return [
            'q' => ['nullable', 'string', 'max:255'],
            'source' => ['nullable', Rule::in(['events', 'restaurants'])],
            'status' => ['nullable', Rule::in(['active', 'unsubscribed'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function query(array $validated)
    {
        return NewsletterSubscription::query()
            ->when($validated['q'] ?? null, function ($query, string $q): void {
                $needle = '%'.mb_strtolower($q).'%';
                $query->whereRaw('LOWER(email) LIKE ?', [$needle]);
            })
            ->when($validated['source'] ?? null, fn ($query, string $source) => $query->where('source', $source))
            ->when($validated['status'] ?? null, fn ($query, string $status) => $query->where('status', $status));
    }

    /**
     * @return array<string, mixed>
     */
    private function row(NewsletterSubscription $subscription): array
    {
        return [
            'id' => $subscription->id,
            'email' => $subscription->email,
            'source' => $subscription->source,
            'language' => $subscription->language,
            'status' => $subscription->status,
            'subscribed_at' => $subscription->subscribed_at,
            'unsubscribed_at' => $subscription->unsubscribed_at,
            'created_at' => $subscription->created_at,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function summary(): array
    {
        return [
            'total' => NewsletterSubscription::query()->count(),
            'active' => NewsletterSubscription::query()->where('status', NewsletterSubscription::STATUS_ACTIVE)->count(),
            'unsubscribed' => NewsletterSubscription::query()->where('status', NewsletterSubscription::STATUS_UNSUBSCRIBED)->count(),
            'by_source' => NewsletterSubscription::query()
                ->selectRaw('source, count(*) as total')
                ->groupBy('source')
                ->pluck('total', 'source'),
        ];
    }
}
