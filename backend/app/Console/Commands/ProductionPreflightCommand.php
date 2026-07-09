<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class ProductionPreflightCommand extends Command
{
    protected $signature = 'production:preflight {--fail-on-warnings : Return a non-zero exit code when warnings are present}';

    protected $description = 'Validate production storage, logging, queues, and deployment safety settings.';

    /**
     * @var array<int, array{level: string, message: string}>
     */
    private array $results = [];

    public function handle(): int
    {
        $this->validateDeploymentSafety();
        $this->validateStorage();
        $this->validateStorageLink();
        $this->validateLogging();
        $this->validateFailedJobs();

        foreach ($this->results as $result) {
            match ($result['level']) {
                'fail' => $this->error('[FAIL] '.$result['message']),
                'warn' => $this->warn('[WARN] '.$result['message']),
                default => $this->info('[OK] '.$result['message']),
            };
        }

        $failures = $this->countResults('fail');
        $warnings = $this->countResults('warn');

        $this->newLine();
        $this->line("Production preflight complete: {$failures} failure(s), {$warnings} warning(s).");

        if ($failures > 0 || ($warnings > 0 && $this->option('fail-on-warnings'))) {
            return self::FAILURE;
        }

        return self::SUCCESS;
    }

    private function validateDeploymentSafety(): void
    {
        $production = app()->environment('production');
        $productionSafetyLevel = $production ? 'fail' : 'warn';

        $this->record($production ? 'ok' : 'warn', 'APP_ENV is '.config('app.env').'. Run this command with production env before release.');
        $this->record(! config('app.debug') ? 'ok' : $productionSafetyLevel, 'APP_DEBUG must be disabled for production.');
        $this->record(Str::startsWith((string) config('app.url'), 'https://') ? 'ok' : $productionSafetyLevel, 'APP_URL must use HTTPS for production.');
        $this->record((bool) config('session.secure') ? 'ok' : $productionSafetyLevel, 'Session cookies must be marked secure for production.');
    }

    private function validateStorage(): void
    {
        $defaultDisk = (string) config('filesystems.default');
        $eventImagesDisk = (string) config('filesystems.event_images_disk');
        $configuredDisks = array_keys(config('filesystems.disks', []));

        $this->record(in_array($defaultDisk, $configuredDisks, true) ? 'ok' : 'fail', "Default filesystem disk [{$defaultDisk}] is configured.");
        $this->record(in_array($eventImagesDisk, $configuredDisks, true) ? 'ok' : 'fail', "Event images disk [{$eventImagesDisk}] is configured.");

        if (app()->environment('production') && in_array($defaultDisk, ['local', 'public'], true)) {
            $this->record('warn', "Production FILESYSTEM_DISK is [{$defaultDisk}]. Use durable shared storage such as s3 for multi-node deployments.");
        }

        foreach ([storage_path('app'), storage_path('framework'), storage_path('logs')] as $path) {
            $this->record(File::isDirectory($path) ? 'ok' : 'fail', "Storage directory exists: {$path}");
            $this->record(File::isWritable($path) ? 'ok' : 'fail', "Storage directory is writable: {$path}");
        }

        foreach (array_unique([$defaultDisk, $eventImagesDisk]) as $disk) {
            if (config("filesystems.disks.{$disk}.driver") !== 's3') {
                continue;
            }

            foreach (['key', 'secret', 'region', 'bucket'] as $key) {
                $value = config("filesystems.disks.{$disk}.{$key}");
                $this->record($this->valueIsPresent($value) ? 'ok' : 'fail', "S3 disk [{$disk}] has {$key} configured.");
            }
        }
    }

    private function validateStorageLink(): void
    {
        $link = public_path('storage');
        $target = storage_path('app/public');
        $usesPublicLocalStorage = in_array(config('filesystems.event_images_disk'), ['public'], true)
            || in_array(config('filesystems.default'), ['public'], true);

        if (! $usesPublicLocalStorage) {
            $this->record('ok', 'Public storage symlink is not required for the configured production disks.');

            return;
        }

        $this->record(File::exists($link) ? 'ok' : 'fail', "Public storage link exists: {$link}");
        $this->record(is_link($link) ? 'ok' : 'fail', "Public storage path is a symlink: {$link}");

        if (is_link($link)) {
            $this->record(readlink($link) === $target ? 'ok' : 'fail', "Public storage link points to {$target}.");
        }
    }

    private function validateLogging(): void
    {
        $default = (string) config('logging.default');
        $stack = (array) config("logging.channels.{$default}.channels", []);
        $channels = $default === 'stack' ? $stack : [$default];
        $productionReadyChannels = ['daily', 'stderr', 'syslog', 'papertrail', 'slack'];
        $hasProductionReadyChannel = array_intersect($channels, $productionReadyChannels) !== [];

        $this->record($hasProductionReadyChannel ? 'ok' : 'warn', 'Logging uses a rotation-friendly or centralized channel.');

        if (in_array('single', $channels, true) && app()->environment('production')) {
            $this->record('warn', 'Production logging includes [single]. Prefer daily, stderr, syslog, or centralized log shipping.');
        }

        if (in_array('daily', $channels, true)) {
            $days = (int) config('logging.channels.daily.days');
            $this->record($days > 0 ? 'ok' : 'fail', "Daily log retention is {$days} day(s).");
        }

        $this->record(File::isWritable(storage_path('logs')) ? 'ok' : 'fail', 'Log directory is writable.');
    }

    private function validateFailedJobs(): void
    {
        $queueConnection = (string) config('queue.default');
        $failedDriver = (string) config('queue.failed.driver');
        $failedTable = (string) config('queue.failed.table');

        if (app()->environment('production') && $queueConnection === 'sync') {
            $this->record('warn', 'Production QUEUE_CONNECTION is sync. Use redis, database, or sqs for queued mail and background work.');
        } else {
            $this->record('ok', "Queue connection is [{$queueConnection}].");
        }

        $this->record($failedDriver !== 'null' ? 'ok' : 'fail', 'Failed jobs are persisted.');
        $this->record($failedTable !== '' ? 'ok' : 'fail', "Failed jobs table is configured as [{$failedTable}].");
    }

    private function valueIsPresent(mixed $value): bool
    {
        if ($value === null || $value === '') {
            return false;
        }

        $normalized = Str::lower(trim((string) $value));

        return ! str_contains($normalized, 'change_me')
            && ! str_contains($normalized, 'replace-with')
            && ! str_contains($normalized, 'your-');
    }

    private function record(string $level, string $message): void
    {
        $this->results[] = compact('level', 'message');
    }

    private function countResults(string $level): int
    {
        return count(array_filter($this->results, fn (array $result): bool => $result['level'] === $level));
    }
}
