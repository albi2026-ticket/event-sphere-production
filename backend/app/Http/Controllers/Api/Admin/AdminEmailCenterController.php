<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\EmailLog;
use App\Models\EmailTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Blade;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminEmailCenterController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'module' => ['nullable', Rule::in($this->modules())],
            'status' => ['nullable', Rule::in($this->statuses())],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'q' => ['nullable', 'string', 'max:255'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $logs = EmailLog::query()
            ->when($validated['module'] ?? null, fn ($query, $module) => $query->where('module', $module))
            ->when($validated['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->when($validated['date_from'] ?? null, fn ($query, $date) => $query->whereDate('created_at', '>=', $date))
            ->when($validated['date_to'] ?? null, fn ($query, $date) => $query->whereDate('created_at', '<=', $date))
            ->when($validated['q'] ?? null, function ($query, $q): void {
                $needle = '%'.mb_strtolower($q).'%';

                $query->where(function ($query) use ($needle): void {
                    $query->whereRaw('LOWER(recipient_name) LIKE ?', [$needle])
                        ->orWhereRaw('LOWER(recipient_email) LIKE ?', [$needle])
                        ->orWhereRaw('LOWER(subject) LIKE ?', [$needle]);
                });
            })
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(25);

        $summary = $this->summary();

        return response()->json([
            'data' => [
                'email_logs' => $logs->through(fn (EmailLog $log): array => [
                    'id' => $log->id,
                    'recipient_name' => $log->recipient_name,
                    'recipient_email' => $log->recipient_email,
                    'email_type' => $log->email_type,
                    'module' => $log->module,
                    'subject' => $log->subject,
                    'status' => $log->status,
                    'sent_at' => $log->sent_at,
                    'created_at' => $log->created_at,
                ])->items(),
                'meta' => [
                    'current_page' => $logs->currentPage(),
                    'last_page' => $logs->lastPage(),
                    'per_page' => $logs->perPage(),
                    'total' => $logs->total(),
                ],
                'filters' => [
                    'modules' => $this->modules(),
                    'statuses' => $this->statuses(),
                ],
                'summary' => $summary,
                'templates' => EmailTemplate::query()->orderBy('name')->get(),
            ],
        ]);
    }

    public function show(EmailLog $emailLog): JsonResponse
    {
        return response()->json([
            'data' => $this->detailPayload($emailLog),
        ]);
    }

    public function retry(Request $request, EmailLog $emailLog): JsonResponse
    {
        return response()->json([
            'message' => 'Email retry is unavailable because rendered email bodies are no longer stored.',
        ], 422);
    }

    public function export(Request $request): StreamedResponse
    {
        $validated = $request->validate([
            'module' => ['nullable', Rule::in($this->modules())],
            'status' => ['nullable', Rule::in($this->statuses())],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'q' => ['nullable', 'string', 'max:255'],
            'format' => ['nullable', Rule::in(['csv', 'excel'])],
        ]);

        $format = $validated['format'] ?? 'csv';
        $filename = 'event-sphere-email-logs-'.now()->format('Ymd-His').($format === 'excel' ? '.xls' : '.csv');
        $headers = [
            'Content-Type' => $format === 'excel' ? 'application/vnd.ms-excel; charset=UTF-8' : 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ];

        return response()->streamDownload(function () use ($validated, $format): void {
            $rows = $this->filteredQuery($validated)
                ->orderByDesc('created_at')
                ->orderByDesc('id')
                ->get();

            if ($format === 'excel') {
                echo "<table><thead><tr>";
                foreach ($this->exportHeaders() as $header) {
                    echo '<th>'.e($header).'</th>';
                }
                echo '</tr></thead><tbody>';
                foreach ($rows as $log) {
                    echo '<tr>';
                    foreach ($this->exportRow($log) as $cell) {
                        echo '<td>'.e($cell).'</td>';
                    }
                    echo '</tr>';
                }
                echo '</tbody></table>';

                return;
            }

            $out = fopen('php://output', 'w');
            fputcsv($out, $this->exportHeaders());
            foreach ($rows as $log) {
                fputcsv($out, $this->exportRow($log));
            }
            fclose($out);
        }, $filename, $headers);
    }

    public function updateTemplate(Request $request, EmailTemplate $template): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'subject' => ['nullable', 'string', 'max:255'],
            'html_template' => ['nullable', 'string'],
            'text_template' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $template->update($validated);
        AuditLog::record($request->user(), 'email_template.updated', $template, ['key' => $template->key], $request->ip());

        return response()->json(['data' => $template->fresh()]);
    }

    public function preview(Request $request, EmailTemplate $template): JsonResponse
    {
        $request->validate([
            'format' => ['nullable', Rule::in(['html', 'text'])],
        ]);

        $sample = [
            'platform_name' => 'Tiketa',
            'user_name' => 'Jane Doe',
            'event_name' => 'Sample Event',
            'order' => (object) ['order_number' => 'ES-SAMPLE-0001'],
        ];
        $format = $request->input('format', 'html');
        $source = $format === 'text' ? $template->text_template : $template->html_template;

        return response()->json([
            'data' => [
                'format' => $format,
                'rendered' => $source ? Blade::render($source, $sample) : 'Default code template is currently active.',
            ],
        ]);
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function filteredQuery(array $validated)
    {
        return EmailLog::query()
            ->when($validated['module'] ?? null, fn ($query, $module) => $query->where('module', $module))
            ->when($validated['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->when($validated['date_from'] ?? null, fn ($query, $date) => $query->whereDate('created_at', '>=', $date))
            ->when($validated['date_to'] ?? null, fn ($query, $date) => $query->whereDate('created_at', '<=', $date))
            ->when($validated['q'] ?? null, function ($query, $q): void {
                $needle = '%'.mb_strtolower($q).'%';

                $query->where(function ($query) use ($needle): void {
                    $query->whereRaw('LOWER(recipient_name) LIKE ?', [$needle])
                        ->orWhereRaw('LOWER(recipient_email) LIKE ?', [$needle])
                        ->orWhereRaw('LOWER(subject) LIKE ?', [$needle]);
                });
            });
    }

    /**
     * @return array<string, mixed>
     */
    private function summary(): array
    {
        $today = now()->toDateString();
        $successToday = EmailLog::query()
            ->where('status', EmailLog::STATUS_SUCCESS)
            ->whereDate('sent_at', $today)
            ->count();
        $failedToday = EmailLog::query()
            ->where('status', EmailLog::STATUS_FAILED)
            ->whereDate('created_at', $today)
            ->count();
        $pending = EmailLog::query()
            ->where('status', EmailLog::STATUS_PENDING)
            ->count();
        $resolvedToday = $successToday + $failedToday;

        return [
            'emails_sent_today' => $successToday,
            'emails_failed_today' => $failedToday,
            'pending_emails' => $pending,
            'success_rate' => $resolvedToday > 0 ? round(($successToday / $resolvedToday) * 100, 1) : 100.0,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function detailPayload(EmailLog $log): array
    {
        return [
            'id' => $log->id,
            'recipient_name' => $log->recipient_name,
            'recipient_email' => $log->recipient_email,
            'module' => $log->module,
            'email_type' => $log->email_type,
            'subject' => $log->subject,
            'status' => $log->status,
            'created_at' => $log->created_at,
            'sent_at' => $log->sent_at,
            'mailable_class' => $log->mailable_class,
            'can_retry' => false,
        ];
    }

    /**
     * @return array<int, string>
     */
    private function exportHeaders(): array
    {
        return ['Recipient', 'Email', 'Module', 'Email Type', 'Subject', 'Status', 'Created At', 'Sent At'];
    }

    /**
     * @return array<int, string>
     */
    private function exportRow(EmailLog $log): array
    {
        return [
            (string) ($log->recipient_name ?: ''),
            (string) $log->recipient_email,
            (string) $log->module,
            (string) $log->email_type,
            (string) $log->subject,
            (string) $log->status,
            (string) optional($log->created_at)->toDateTimeString(),
            (string) optional($log->sent_at)->toDateTimeString(),
        ];
    }

    /**
     * @return array<int, string>
     */
    private function statuses(): array
    {
        return [
            EmailLog::STATUS_PENDING,
            EmailLog::STATUS_SUCCESS,
            EmailLog::STATUS_FAILED,
        ];
    }

    /**
     * @return array<int, string>
     */
    private function modules(): array
    {
        return [
            EmailLog::MODULE_RESERVATIONS,
            EmailLog::MODULE_EVENTS,
            EmailLog::MODULE_SYSTEM,
            EmailLog::MODULE_ORGANIZER,
            EmailLog::MODULE_OWNER,
            EmailLog::MODULE_USER,
        ];
    }
}
