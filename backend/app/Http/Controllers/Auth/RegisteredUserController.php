<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;

class RegisteredUserController extends Controller
{
    /**
     * Handle an incoming registration request.
     */
    public function store(RegisterRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $requestedRole = $validated['role'] ?? User::ROLE_USER;
        $firstName = $validated['first_name'] ?? null;
        $lastName = $validated['last_name'] ?? null;

        $user = User::create([
            'name' => $validated['name'] ?? trim($firstName.' '.$lastName) ?: $validated['email'],
            'first_name' => $firstName,
            'last_name' => $lastName,
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $requestedRole,
            'phone' => $validated['phone'] ?? null,
            'default_city' => $validated['default_city'] ?? null,
            'organizer_status' => $requestedRole === User::ROLE_ORGANIZER
                ? User::ORGANIZER_STATUS_PENDING
                : User::ORGANIZER_STATUS_NONE,
        ]);

        event(new Registered($user));

        $token = $user->createToken(
            $request->string('device_name')->toString() ?: 'event-sphere-api'
        )->plainTextToken;

        return response()->json([
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => $user,
        ], 201);
    }
}
