<?php

namespace App\Http\Controllers\Api\User;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Profile\UpdateProfileRequest;
use App\Http\Resources\UserProfileResource;
use Illuminate\Http\Request;

class UserProfileController extends Controller
{
    public function show(Request $request): UserProfileResource
    {
        return new UserProfileResource($request->user());
    }

    public function update(UpdateProfileRequest $request): UserProfileResource
    {
        $user = $request->user();
        $user->update($request->validated());

        return new UserProfileResource($user->fresh());
    }
}
