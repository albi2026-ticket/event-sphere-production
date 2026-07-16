<?php

namespace App\Services\Storage;

use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Facades\Storage;

class PublicStorageUrl
{
    public function imageUrl(?string $disk, ?string $path, ?string $fallbackUrl = null, ?string $defaultBucket = null): ?string
    {
        if ($path) {
            if ($this->isPublicUrl($path)) {
                return $path;
            }

            if ($url = $this->supabasePublicUrl($path, $defaultBucket)) {
                return $url;
            }

            if ($disk) {
                return Storage::disk($disk)->url($path);
            }
        }

        return $fallbackUrl;
    }

    public function objectPath(string $path, ?string $defaultBucket = null): string
    {
        return $this->pathParts($path, $defaultBucket)['object_path'];
    }

    public function bucket(string $path, ?string $defaultBucket = null): string
    {
        return $this->pathParts($path, $defaultBucket)['bucket'];
    }

    public function diskForBucket(string $bucket): Filesystem
    {
        return Storage::build(array_merge(
            config('filesystems.disks.supabase', []),
            ['bucket' => $bucket],
        ));
    }

    public function diskForPath(string $path, ?string $defaultBucket = null): Filesystem
    {
        return $this->diskForBucket($this->bucket($path, $defaultBucket));
    }

    public function hasSupabasePublicUrl(): bool
    {
        return trim((string) config('services.supabase.storage_public_url')) !== '';
    }

    private function supabasePublicUrl(string $path, ?string $defaultBucket = null): ?string
    {
        $baseUrl = trim((string) config('services.supabase.storage_public_url'));

        if ($baseUrl === '') {
            return null;
        }

        $parts = $this->pathParts($path, $defaultBucket);

        if ($parts['bucket'] === '') {
            return null;
        }

        return rtrim($baseUrl, '/').'/'.$parts['bucket'].'/'.$parts['object_path'];
    }

    /**
     * @return array{bucket: string, object_path: string}
     */
    private function pathParts(string $path, ?string $defaultBucket = null): array
    {
        $path = ltrim($path, '/');

        if (str_starts_with($path, 'storage/')) {
            $path = substr($path, strlen('storage/'));
        }

        foreach ($this->imageBuckets() as $prefix => $bucket) {
            if (str_starts_with($path, $prefix.'/')) {
                return [
                    'bucket' => $bucket,
                    'object_path' => substr($path, strlen($prefix) + 1),
                ];
            }
        }

        $defaultBucket = trim((string) $defaultBucket, '/');
        if ($defaultBucket !== '') {
            return [
                'bucket' => $defaultBucket,
                'object_path' => $path,
            ];
        }

        return [
            'bucket' => '',
            'object_path' => $path,
        ];
    }

    /**
     * @return array<string, string>
     */
    private function imageBuckets(): array
    {
        return [
            'event-images' => trim((string) config('services.supabase.event_images_bucket', 'event-images'), '/'),
            'venue-images' => trim((string) config('services.supabase.venue_images_bucket', 'venue-images'), '/'),
        ];
    }

    private function isPublicUrl(?string $value): bool
    {
        return is_string($value)
            && (str_starts_with($value, 'http://')
                || str_starts_with($value, 'https://')
                || str_starts_with($value, 'data:'));
    }
}
