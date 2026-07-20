<?php

namespace App\Models\Sanctum;

use App\Support\Performance\AuthPerformanceAudit;
use Laravel\Sanctum\PersonalAccessToken;

class ProfilingPersonalAccessToken extends PersonalAccessToken
{
    public static function findToken($token)
    {
        return AuthPerformanceAudit::measure('PersonalAccessToken lookup', function () use ($token): ?self {
            if (strpos($token, '|') === false) {
                $hashedToken = AuthPerformanceAudit::measure(
                    'Token hashing/comparison',
                    fn (): string => hash('sha256', $token)
                );

                return AuthPerformanceAudit::measure(
                    'PersonalAccessToken database query',
                    fn (): ?self => static::where('token', $hashedToken)->first()
                );
            }

            [$id, $token] = explode('|', $token, 2);

            $instance = AuthPerformanceAudit::measure(
                'PersonalAccessToken database query',
                fn (): ?self => static::find($id)
            );

            if (! $instance) {
                return null;
            }

            return AuthPerformanceAudit::measure(
                'Token hashing/comparison',
                fn (): ?self => hash_equals($instance->token, hash('sha256', $token)) ? $instance : null
            );
        });
    }
}
