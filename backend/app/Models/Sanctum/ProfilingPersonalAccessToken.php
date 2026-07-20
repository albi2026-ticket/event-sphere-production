<?php

namespace App\Models\Sanctum;

use App\Support\Performance\AuthPerformanceAudit;
use Laravel\Sanctum\PersonalAccessToken;

class ProfilingPersonalAccessToken extends PersonalAccessToken
{
    public static function findToken($token)
    {
        return AuthPerformanceAudit::measure('PersonalAccessToken lookup', function () use ($token): ?self {
            $hasIdPrefix = AuthPerformanceAudit::measure(
                'Token format detection',
                fn (): bool => strpos($token, '|') !== false
            );

            if (! $hasIdPrefix) {
                $hashedToken = AuthPerformanceAudit::measure(
                    'SHA-256 hashing',
                    fn (): string => hash('sha256', $token)
                );

                $query = AuthPerformanceAudit::measure(
                    'Build PersonalAccessToken query',
                    fn () => static::where('token', $hashedToken)
                );

                $instance = AuthPerformanceAudit::measure(
                    'PersonalAccessToken query first() total',
                    fn (): ?self => $query->first()
                );

                AuthPerformanceAudit::annotateLastSqlRows('Execute PersonalAccessToken SQL', $instance instanceof self ? 1 : 0);
                AuthPerformanceAudit::measure('Hydrate PersonalAccessToken model', fn (): ?self => $instance);

                return $instance;
            }

            [$id, $token] = AuthPerformanceAudit::measure(
                "explode('|', token)",
                fn (): array => explode('|', $token, 2)
            );

            $query = AuthPerformanceAudit::measure(
                'Build PersonalAccessToken query',
                fn () => static::query()->whereKey($id)
            );

            $instance = AuthPerformanceAudit::measure(
                'PersonalAccessToken query first() total',
                fn (): ?self => $query->first()
            );

            AuthPerformanceAudit::annotateLastSqlRows('Execute PersonalAccessToken SQL', $instance instanceof self ? 1 : 0);
            AuthPerformanceAudit::measure('Hydrate PersonalAccessToken model', fn (): ?self => $instance);

            if (! $instance) {
                return null;
            }

            $hashedToken = AuthPerformanceAudit::measure(
                'SHA-256 hashing',
                fn (): string => hash('sha256', $token)
            );

            return AuthPerformanceAudit::measure(
                'Compare stored hash',
                fn (): ?self => hash_equals($instance->token, $hashedToken) ? $instance : null
            );
        });
    }
}
