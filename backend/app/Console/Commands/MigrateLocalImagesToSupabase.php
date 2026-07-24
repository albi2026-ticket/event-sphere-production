<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Throwable;

class MigrateLocalImagesToSupabase extends Command
{
    protected $signature = 'storage:migrate-local-images-to-supabase
        {--force : Overwrite files that already exist in Supabase Storage}
        {--dry-run : Show what would be copied without writing to Supabase}';

    protected $description = 'Copy existing local public event and venue images to Supabase Storage without changing database records.';

    /**
     * @var array<int, array{source: string, destination: string, bucket: string}>
     */
    private array $sources = [
        [
            'source' => 'event-images',
            'destination' => '',
            'bucket' => 'event-images',
        ],
        [
            'source' => 'venue-images',
            'destination' => '',
            'bucket' => 'venue-images',
        ],
    ];

    public function handle(): int
    {
        $sourceDisk = Storage::disk('public');
        $dryRun = (bool) $this->option('dry-run');
        $force = (bool) $this->option('force');

        $this->info('Migrating local public images to Supabase Storage.');
        $this->line('Source disk: public');
        $this->line('Destination: Supabase Storage buckets');
        $this->line('Mode: '.($dryRun ? 'dry run' : ($force ? 'overwrite existing files' : 'skip existing files')));
        $this->newLine();

        $totals = [
            'found' => 0,
            'copied' => 0,
            'skipped' => 0,
            'failed' => 0,
        ];

        foreach ($this->sources as $source) {
            $result = $this->migrateDirectory(
                sourceDisk: $sourceDisk,
                destinationDisk: $this->destinationDisk($source['bucket']),
                sourceDirectory: $source['source'],
                destinationPrefix: $source['destination'],
                bucket: $source['bucket'],
                dryRun: $dryRun,
                force: $force,
            );

            foreach ($totals as $key => $value) {
                $totals[$key] = $value + $result[$key];
            }
        }

        $this->newLine();
        $this->info('Migration summary');
        $this->line("Found: {$totals['found']}");
        $this->line("Copied: {$totals['copied']}");
        $this->line("Skipped: {$totals['skipped']}");
        $this->line("Failed: {$totals['failed']}");

        return $totals['failed'] > 0 ? self::FAILURE : self::SUCCESS;
    }

    private function destinationDisk(string $bucket): mixed
    {
        return Storage::build(array_merge(
            config('filesystems.disks.supabase', []),
            ['bucket' => $bucket],
        ));
    }

    /**
     * @return array{found: int, copied: int, skipped: int, failed: int}
     */
    private function migrateDirectory(
        mixed $sourceDisk,
        mixed $destinationDisk,
        string $sourceDirectory,
        string $destinationPrefix,
        string $bucket,
        bool $dryRun,
        bool $force,
    ): array {
        $files = collect($sourceDisk->allFiles($sourceDirectory))
            ->filter(fn (string $path): bool => ! str_ends_with($path, '.DS_Store'))
            ->values();

        $this->info("{$sourceDirectory}: {$files->count()} file(s) found for bucket [{$bucket}].");

        if ($files->isEmpty()) {
            return ['found' => 0, 'copied' => 0, 'skipped' => 0, 'failed' => 0];
        }

        $bar = $this->output->createProgressBar($files->count());
        $bar->start();

        $result = [
            'found' => $files->count(),
            'copied' => 0,
            'skipped' => 0,
            'failed' => 0,
        ];

        foreach ($files as $sourcePath) {
            $destinationPath = $this->destinationPath($sourcePath, $sourceDirectory, $destinationPrefix);

            try {
                if (! $force && $destinationDisk->exists($destinationPath)) {
                    $result['skipped']++;
                    $bar->advance();

                    continue;
                }

                if (! $dryRun) {
                    $stream = $sourceDisk->readStream($sourcePath);

                    if ($stream === false) {
                        throw new \RuntimeException("Unable to read [{$sourcePath}].");
                    }

                    try {
                        $destinationDisk->put($destinationPath, $stream, [
                            'visibility' => 'public',
                        ]);
                    } finally {
                        if (is_resource($stream)) {
                            fclose($stream);
                        }
                    }
                }

                $result['copied']++;
            } catch (Throwable $exception) {
                $result['failed']++;
                $this->newLine();
                $this->error("Failed: {$sourcePath} -> {$bucket}/{$destinationPath}");
                $this->line($exception->getMessage());
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);
        $this->line("{$sourceDirectory}: copied {$result['copied']}, skipped {$result['skipped']}, failed {$result['failed']}.");
        $this->newLine();

        return $result;
    }

    private function destinationPath(string $sourcePath, string $sourceDirectory, string $destinationPrefix): string
    {
        $relativePath = preg_replace('#^'.preg_quote($sourceDirectory, '#').'/#', '', $sourcePath) ?? $sourcePath;

        return trim($destinationPrefix.'/'.$relativePath, '/');
    }
}
