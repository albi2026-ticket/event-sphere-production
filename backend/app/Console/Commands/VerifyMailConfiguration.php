<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class VerifyMailConfiguration extends Command
{
    protected $signature = 'app:verify-mail';

    protected $description = 'Verify production mail transport configuration.';

    public function handle(): int
    {
        $checks = [
            'MAIL_MAILER' => config('mail.default'),
            'RESEND_KEY' => config('services.resend.key'),
            'MAIL_FROM_ADDRESS' => config('mail.from.address'),
            'MAIL_FROM_NAME' => config('mail.from.name'),
        ];

        $failed = false;

        foreach ($checks as $name => $value) {
            if (! is_string($value) || trim($value) === '') {
                $this->error("[FAIL] {$name} is not configured.");
                $failed = true;

                continue;
            }

            $this->info("[OK] {$name} is configured.");
        }

        if (config('mail.default') !== 'resend') {
            $this->error('[FAIL] MAIL_MAILER must be set to [resend] for production Resend delivery.');
            $failed = true;
        }

        $fromAddress = (string) config('mail.from.address');

        if ($fromAddress !== '' && ! filter_var($fromAddress, FILTER_VALIDATE_EMAIL)) {
            $this->error('[FAIL] MAIL_FROM_ADDRESS must be a valid email address.');
            $failed = true;
        }

        $queueConnection = (string) config('queue.default');

        if ($queueConnection === 'sync') {
            $this->info('[OK] QUEUE_CONNECTION is sync; queued mail will be delivered inline by the web process.');
        } else {
            $this->warn("[WARN] QUEUE_CONNECTION is [{$queueConnection}]. Queued mail requires a running queue worker, for example: php artisan queue:work {$queueConnection} --queue=default");
            $this->warn('[WARN] If Railway only runs the web process, set QUEUE_CONNECTION=sync or deploy a separate worker service.');
        }

        if ($failed) {
            $this->newLine();
            $this->error('Mail configuration verification failed.');

            return self::FAILURE;
        }

        $this->newLine();
        $this->info('Mail configuration is ready for Resend.');

        return self::SUCCESS;
    }
}
