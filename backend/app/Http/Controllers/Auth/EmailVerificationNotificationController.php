<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\Emails\MailDeliveryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmailVerificationNotificationController extends Controller
{
    /**
     * Send a new email verification notification.
     */
    public function store(Request $request): JsonResponse
    {
        if ($request->user()->hasVerifiedEmail()) {
            return response()->json(['status' => 'already-verified']);
        }

        if (! app(MailDeliveryService::class)->sendVerification($request->user())) {
            return response()->json([
                'message' => 'We could not send the verification email right now. Please try again in a moment.',
            ], 503);
        }

        return response()->json(['status' => 'verification-link-sent']);
    }
}
