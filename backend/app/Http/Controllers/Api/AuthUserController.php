<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserProfileResource;
use Illuminate\Http\Request;

class AuthUserController extends Controller
{
    public function show(Request $request): UserProfileResource
    {
        return new UserProfileResource($request->user());
    }
}
