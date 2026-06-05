<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\EmailTemplate;
use App\Models\Order;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Blade;
use Illuminate\Validation\Rule;

class AdminEmailCenterController extends Controller
{
    public function index(): JsonResponse
    {
        $orderEmails = Order::query()
            ->with('user:id,name,email')
            ->latest()
            ->limit(50)
            ->get()
            ->map(fn (Order $order) => [
                'type' => 'order_confirmation',
                'label' => 'Order Confirmation Email',
                'recipient' => $order->billing_email ?: $order->user?->email,
                'reference' => $order->order_number,
                'sent' => $order->order_confirmation_email_sent_at !== null,
                'sent_at' => $order->order_confirmation_email_sent_at,
            ])
            ->toBase();

        $verificationEmails = User::query()
            ->latest()
            ->limit(50)
            ->get()
            ->map(fn (User $user) => [
                'type' => 'verification_email',
                'label' => 'Verification Email',
                'recipient' => $user->email,
                'reference' => $user->name,
                'sent' => $user->email_verified_at !== null,
                'sent_at' => $user->email_verified_at,
            ])
            ->toBase();

        return response()->json([
            'data' => [
                'email_statuses' => $orderEmails->merge($verificationEmails)->values(),
                'templates' => EmailTemplate::query()->orderBy('name')->get(),
                'future_ready' => ['event_cancelled', 'event_updated', 'marketing_email'],
            ],
        ]);
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
            'platform_name' => 'Event Sphere',
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
}
