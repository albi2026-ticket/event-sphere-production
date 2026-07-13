# Tiketa Production Optimization

Run these commands from the `backend` directory after deploying code and installing production dependencies.

## Preflight

Run the production preflight before taking traffic:

```bash
composer deploy:preflight
```

To fail the deployment on warnings as well as failures:

```bash
php artisan production:preflight --fail-on-warnings
```

The preflight validates:

- production safety settings such as `APP_DEBUG=false`, HTTPS `APP_URL`, and secure session cookies
- configured default and event-image storage disks
- storage directory writability
- public storage symlink correctness when local public storage is used
- S3 disk credentials when S3 disks are configured
- rotation-friendly or centralized logging
- failed-job persistence
- queue connection safety

## Deploy

```bash
composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader
composer deploy:preflight
composer deploy:optimize
```

`composer deploy:optimize` performs:

```bash
composer dump-autoload --optimize --no-dev
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan event:cache
php artisan view:cache
php artisan optimize
php artisan queue:restart
```

## Rollback

After switching the release symlink or restoring the previous artifact, clear stale framework caches and restart queue workers:

```bash
composer deploy:rollback
```

Equivalent manual commands:

```bash
php artisan optimize:clear
php artisan queue:restart
```

## Storage

Production should use durable shared storage for user-uploaded assets:

```bash
FILESYSTEM_DISK=s3
EVENT_IMAGES_DISK=s3
```

Required S3 variables:

```bash
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_DEFAULT_REGION=...
AWS_BUCKET=...
```

When local public storage is intentionally used on a single-node deployment, create and verify the public symlink:

```bash
php artisan storage:link
php artisan production:preflight
```

Multi-node deployments should not rely on node-local `storage/app/public` for uploaded images unless that path is backed by shared persistent storage.

## Logging

Use rotating or centralized logs in production. The recommended baseline is:

```bash
LOG_CHANNEL=stack
LOG_STACK=daily
LOG_LEVEL=warning
LOG_DAILY_DAYS=14
```

Container platforms should usually use `stderr` and ship logs through the platform:

```bash
LOG_CHANNEL=stack
LOG_STACK=stderr
```

Avoid `LOG_STACK=single` in production unless external logrotate is configured for `storage/logs/laravel.log`.

## Queue Workers

Production should use an async queue backend such as Redis:

```bash
QUEUE_CONNECTION=redis
REDIS_QUEUE_CONNECTION=default
REDIS_QUEUE=default
REDIS_QUEUE_RETRY_AFTER=90
REDIS_QUEUE_BLOCK_FOR=5
```

Run workers under a process manager such as Supervisor or systemd:

```bash
php artisan queue:work redis --queue=default --sleep=1 --tries=3 --backoff=5 --timeout=60 --max-jobs=1000 --max-time=3600
```

Restart workers after every deploy:

```bash
php artisan queue:restart
```

## Failed Jobs

Failed jobs should be persisted so operators can inspect and retry them:

```bash
QUEUE_FAILED_DRIVER=database-uuids
```

Operational commands:

```bash
php artisan queue:failed
php artisan queue:retry all
php artisan queue:prune-failed --hours=168
```

Schedule failed-job pruning according to the incident-retention policy. Keep at least 7 days in production unless compliance requires longer retention.

## Backup Strategy

Minimum production backup coverage:

- PostgreSQL point-in-time recovery or automated daily snapshots
- Redis persistence or managed Redis backups when Redis contains queues, cache, or sessions that must survive node loss
- S3/object-storage versioning for uploaded assets
- encrypted off-site backups
- documented restore test at least once per release cycle

Recommended backup cadence:

- database PITR: continuous, with at least 7-30 days retention
- database logical dump: daily
- object storage: versioning enabled, lifecycle rules reviewed monthly
- config and deployment artifacts: retained per release

Before risky deploys or migrations:

```bash
php artisan down --render=errors::503
composer deploy:preflight
php artisan migrate --force
composer deploy:optimize
php artisan up
```

Use managed-provider snapshot tools for the actual database/object-store backup operations; do not store production backups inside the application server filesystem.

## Disaster Recovery

Document and rehearse these recovery paths:

- restore database to a new production-compatible instance
- repoint `DB_HOST` and related secrets
- verify object storage bucket/version restoration
- run `composer deploy:preflight`
- run `composer deploy:optimize`
- restart queue workers
- verify `/up`, login, checkout reservation expiry, image retrieval, and queued mail

Target baseline:

- RPO: 24 hours or better, ideally PITR-backed
- RTO: 1-4 hours depending on hosting provider restore time

Do not promote a deployment to production until the restore path has been tested against staging or an isolated recovery environment.

## OPcache Recommendations

Set these in the production PHP-FPM OPcache configuration, then reload PHP-FPM:

```ini
opcache.enable=1
opcache.enable_cli=0
opcache.memory_consumption=256
opcache.interned_strings_buffer=16
opcache.max_accelerated_files=20000
opcache.validate_timestamps=0
opcache.revalidate_freq=0
opcache.save_comments=1
opcache.jit=disable
```

When `opcache.validate_timestamps=0`, every deploy or rollback must reload PHP-FPM so workers load the new release:

```bash
sudo systemctl reload php-fpm
```

Use the service name for the deployed PHP version, for example `php8.3-fpm`, when the host does not expose a generic `php-fpm` service.
