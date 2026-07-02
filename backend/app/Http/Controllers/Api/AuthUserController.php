<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserProfileResource;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AuthUserController extends Controller
{
    public function show(Request $request): UserProfileResource
    {
        return new UserProfileResource($request->user());
    }

    public function updateLanguage(Request $request): UserProfileResource
    {
        $validated = $request->validate([
            'preferred_language' => ['required', Rule::in(['en', 'sq'])],
        ]);

        $request->user()->forceFill([
            'preferred_language' => $validated['preferred_language'],
        ])->save();

        return new UserProfileResource($request->user()->fresh());
    }
}
