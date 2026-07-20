<?php

namespace App\Support\Performance;

use Illuminate\Contracts\Auth\Factory as AuthFactory;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Laravel\Sanctum\Events\TokenAuthenticated;
use Laravel\Sanctum\HasApiTokens;
use Laravel\Sanctum\Sanctum;
use Laravel\Sanctum\TransientToken;

class ProfilingSanctumGuard
{
    public function __construct(
        protected AuthFactory $auth,
        protected $expiration = null,
        protected $provider = null,
        protected bool $trackLastUsedAt = true
    ) {
    }

    public function __invoke(Request $request): mixed
    {
        return AuthPerformanceAudit::measure('Sanctum Guard', function () use ($request): mixed {
            foreach (Arr::wrap(config('sanctum.guard', 'web')) as $guard) {
                $user = AuthPerformanceAudit::measure(
                    "Sanctum configured guard [{$guard}] user()",
                    fn () => $this->auth->guard($guard)->user()
                );

                if ($user) {
                    return $this->supportsTokens($user)
                        ? $user->withAccessToken(new TransientToken)
                        : $user;
                }
            }

            $token = AuthPerformanceAudit::measure(
                'Sanctum bearer token extraction',
                fn (): ?string => $this->getTokenFromRequest($request)
            );

            if (! $token) {
                return null;
            }

            $model = Sanctum::$personalAccessTokenModel;

            $accessToken = $model::findToken($token);

            if (! AuthPerformanceAudit::measure('Sanctum access token validation', fn (): bool => $this->isValidAccessToken($accessToken))) {
                return null;
            }

            $tokenable = $accessToken->tokenable;

            if (! AuthPerformanceAudit::measure('Sanctum tokenable supports tokens check', fn (): bool => $this->supportsTokens($tokenable))) {
                return null;
            }

            AuthPerformanceAudit::measure(
                'Assign access token to user',
                fn () => $tokenable->withAccessToken($accessToken)
            );

            AuthPerformanceAudit::measure(
                'Authentication event: TokenAuthenticated',
                fn () => event(new TokenAuthenticated($accessToken))
            );

            if ($this->trackLastUsedAt) {
                AuthPerformanceAudit::measure(
                    'PersonalAccessToken last_used_at update',
                    fn () => $this->updateLastUsedAt($accessToken)
                );
            }

            return $tokenable;
        });
    }

    protected function supportsTokens($tokenable = null): bool
    {
        return $tokenable && in_array(HasApiTokens::class, class_uses_recursive(
            get_class($tokenable)
        ), true);
    }

    protected function getTokenFromRequest(Request $request): ?string
    {
        if (is_callable(Sanctum::$accessTokenRetrievalCallback)) {
            return (string) (Sanctum::$accessTokenRetrievalCallback)($request);
        }

        $token = $request->bearerToken();

        return $this->isValidBearerToken($token) ? $token : null;
    }

    protected function isValidBearerToken(?string $token = null): bool
    {
        if (! is_null($token) && str_contains($token, '|')) {
            $model = new Sanctum::$personalAccessTokenModel;

            if ($model->getKeyType() === 'int') {
                [$id, $token] = explode('|', $token, 2);

                return ctype_digit($id) && ! empty($token);
            }
        }

        return ! empty($token);
    }

    protected function isValidAccessToken($accessToken): bool
    {
        if (! $accessToken) {
            return false;
        }

        $tokenable = AuthPerformanceAudit::measure(
            'User lookup',
            fn () => $accessToken->tokenable
        );

        AuthPerformanceAudit::measure('User model hydration', fn () => $tokenable);
        AuthPerformanceAudit::measure('Authentication eager loaded relationships', fn (): array => $tokenable?->getRelations() ?? []);

        $isValid =
            (! $this->expiration || $accessToken->created_at->gt(now()->subMinutes($this->expiration)))
            && (! $accessToken->expires_at || ! $accessToken->expires_at->isPast())
            && AuthPerformanceAudit::measure(
                'Sanctum token provider validation',
                fn (): bool => $this->hasValidProvider($tokenable)
            );

        if (is_callable(Sanctum::$accessTokenAuthenticationCallback)) {
            $isValid = AuthPerformanceAudit::measure(
                'Sanctum access token authentication callback',
                fn (): bool => (bool) (Sanctum::$accessTokenAuthenticationCallback)($accessToken, $isValid)
            );
        }

        return $isValid;
    }

    protected function hasValidProvider($tokenable): bool
    {
        if (is_null($this->provider)) {
            return true;
        }

        $model = config("auth.providers.{$this->provider}.model");

        return $tokenable instanceof $model;
    }

    protected function updateLastUsedAt($accessToken): void
    {
        if (method_exists($accessToken->getConnection(), 'hasModifiedRecords') &&
            method_exists($accessToken->getConnection(), 'setRecordModificationState')) {
            $hasModifiedRecords = $accessToken->getConnection()->hasModifiedRecords();
            $accessToken->forceFill(['last_used_at' => now()])->save();

            $accessToken->getConnection()->setRecordModificationState($hasModifiedRecords);

            return;
        }

        $accessToken->forceFill(['last_used_at' => now()])->save();
    }
}
