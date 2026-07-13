<?php

namespace Tests\Feature\Security;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SecurityHeadersTest extends TestCase
{
    use RefreshDatabase;

    public function test_security_headers_are_added_to_api_responses(): void
    {
        $response = $this->getJson('/api/events');

        $response->assertOk();
        $response->assertHeader('Content-Security-Policy');
        $response->assertHeader('X-Frame-Options', 'DENY');
        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->assertHeader('Permissions-Policy');
        $response->assertHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
        $response->assertHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        $response->assertHeader('Origin-Agent-Cluster', '?1');

        $this->assertStringContainsString("default-src 'self'", $response->headers->get('Content-Security-Policy'));
        $this->assertStringContainsString("frame-ancestors 'none'", $response->headers->get('Content-Security-Policy'));
        $this->assertStringContainsString("script-src-elem 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://maps.googleapis.com", $response->headers->get('Content-Security-Policy'));
        $this->assertStringContainsString('img-src', $response->headers->get('Content-Security-Policy'));
        $this->assertStringContainsString("font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net", $response->headers->get('Content-Security-Policy'));
        $this->assertStringContainsString("connect-src 'self' https: wss:", $response->headers->get('Content-Security-Policy'));
        $this->assertStringContainsString('camera=(self)', $response->headers->get('Permissions-Policy'));
    }

    public function test_hsts_is_added_to_secure_responses(): void
    {
        $response = $this->getJson('https://localhost/api/events');

        $response->assertOk();
        $response->assertHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
}
