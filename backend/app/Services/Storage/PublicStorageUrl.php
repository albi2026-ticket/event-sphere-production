<?php

namespace App\Services\Storage;

use Illuminate\Support\Facades\Storage;

class PublicStorageUrl
{
    public function imageUrl(?string $disk, ?string $path, ?string $fallbackUrl = null): ?string
    {
        if ($path) {
            if ($this->isPublicUrl($path)) {
                return $path;
            }

            if ($url = $this->supabasePublicUrl($path)) {
                return $url;
            }

            if ($disk) {
                return Storage::disk($disk)->url($path);
            }
        }

        return $fallbackUrl;
    }

    public function objectPath(string $path): string
    {
        $path = ltrim($path, '/');

        if (str_starts_with($path, 'storage/')) {
            $path = substr($path, strlen('storage/'));
        }

        $bucket = trim((string) config('services.supabase.storage_bucket'), '/');

        if ($bucket !== '' && str_starts_with($path, $bucket.'/')) {
            return substr($path, strlen($bucket) + 1);
        }

        return $path;
    }

    public function hasSupabasePublicUrl(): bool
    {
        return trim((string) config('services.supabase.storage_public_url')) !== '';
    }

    private function supabasePublicUrl(string $path): ?string
    {
        $baseUrl = trim((string) config('services.supabase.storage_public_url'));

        if ($baseUrl === '') {
            return null;
        }

        $path = ltrim($path, '/');

        if (str_starts_with($path, 'storage/')) {
            $path = substr($path, strlen('storage/'));
        }

        $bucket = trim((string) config('services.supabase.storage_bucket'), '/');

        if ($bucket !== '' && ! str_starts_with($path, $bucket.'/')) {
            $path = $bucket.'/'.$path;
        }

        return rtrim($baseUrl, '/').'/'.$path;
    }

    private function isPublicUrl(?string $value): bool
    {
        return is_string($value)
            && (str_starts_with($value, 'http://')
                || str_starts_with($value, 'https://')
                || str_starts_with($value, 'data:'));
    }
}
