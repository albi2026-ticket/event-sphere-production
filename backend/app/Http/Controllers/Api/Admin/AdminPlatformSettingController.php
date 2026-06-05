<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\PlatformSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminPlatformSettingController extends Controller
{
    private const KEYS = [
        'platform_name' => 'Event Sphere',
        'support_email' => 'support@eventsphere.com',
        'contact_information' => 'Event Sphere Support',
        'default_purchase_limit' => 10,
        'default_service_fee_percentage' => 10,
        'default_event_status' => 'draft',
        'auto_archive_days_after_event' => 7,
        'reminder_timing_hours' => 24,
        'verification_link_expiration_minutes' => 60,
        'maintenance_mode' => false,
        'registration_enabled' => true,
    ];

    public function show(): JsonResponse
    {
        $settings = [];
        foreach (self::KEYS as $key => $default) {
            $settings[$key] = PlatformSetting::getValue($key, $default);
        }

        return response()->json([
            'data' => $settings,
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'platform_name' => ['sometimes', 'string', 'max:255'],
            'support_email' => ['sometimes', 'email', 'max:255'],
            'contact_information' => ['sometimes', 'string', 'max:1000'],
            'default_purchase_limit' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'default_service_fee_percentage' => ['sometimes', 'numeric', 'min:0', 'max:30'],
            'default_event_status' => ['sometimes', 'in:draft,pending_review,published'],
            'auto_archive_days_after_event' => ['sometimes', 'integer', 'min:0', 'max:365'],
            'reminder_timing_hours' => ['sometimes', 'integer', 'min:1', 'max:720'],
            'verification_link_expiration_minutes' => ['sometimes', 'integer', 'min:5', 'max:10080'],
            'maintenance_mode' => ['sometimes', 'boolean'],
            'registration_enabled' => ['sometimes', 'boolean'],
        ]);

        foreach ($validated as $key => $value) {
            if ($key === 'default_service_fee_percentage') {
                $value = round((float) $value, 2);
            }

            PlatformSetting::setValue($key, $value);
        }

        \App\Models\AuditLog::record($request->user(), 'settings.updated', null, array_keys($validated), $request->ip());

        return $this->show();
    }
}
