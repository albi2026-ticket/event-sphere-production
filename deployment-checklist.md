# Tiketa Deployment Checklist

Use this checklist for every production release. Do not run deployment commands from an unreviewed working tree.

## Pre-Deploy

- [ ] Confirm the release commit/tag and deployment artifact.
- [ ] Confirm `.env` is based on `backend/.env.production.example`.
- [ ] Confirm `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL`, `SESSION_DOMAIN`, and `SANCTUM_STATEFUL_DOMAINS`.
- [ ] Confirm database, Redis, storage, mail, and logging credentials are present in the deployment secret store.
- [ ] Confirm a fresh database backup or point-in-time recovery checkpoint exists.
- [ ] Confirm queue workers and scheduler process management are healthy.
- [ ] Confirm rollback artifact or previous release symlink is available.

## Build

- [ ] Install frontend dependencies with `npm ci`.
- [ ] Build frontend assets with `npm run build`.
- [ ] Confirm the build artifact contains the expected `dist` output.

## Composer

- [ ] Install backend dependencies with:

```bash
cd backend
composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader
```

- [ ] Confirm Composer completes without dependency or platform errors.

## Preflight

- [ ] Run:

```bash
cd backend
composer deploy:preflight
```

- [ ] Resolve all failures.
- [ ] Decide whether warnings block this release.

## Migrations

- [ ] Review pending migrations.
- [ ] Confirm migrations are backward-compatible with the currently running code.
- [ ] Run:

```bash
cd backend
php artisan migrate --force
```

- [ ] Confirm migrations completed successfully.

## Optimize And Cache

- [ ] Run:

```bash
cd backend
composer deploy:optimize
```

- [ ] Confirm config, route, event, and view caches were generated.
- [ ] Confirm queue workers received `queue:restart`.
- [ ] Reload PHP-FPM if OPcache timestamp validation is disabled.

## Storage

- [ ] Confirm `FILESYSTEM_DISK` and `EVENT_IMAGES_DISK`.
- [ ] For S3/object storage, confirm bucket, region, credentials, lifecycle, and versioning.
- [ ] For local public storage, run and verify:

```bash
cd backend
php artisan storage:link
php artisan production:preflight
```

## Permissions

- [ ] Confirm the deploy user can read release files.
- [ ] Confirm the web/PHP-FPM user can write `backend/storage`.
- [ ] Confirm the web/PHP-FPM user can write `backend/bootstrap/cache`.
- [ ] Confirm logs are writable or shipped to `stderr`/centralized logging.

## Health Check

- [ ] Verify `/up` returns success.
- [ ] Verify login page loads.
- [ ] Verify a public events page loads.
- [ ] Verify image URLs resolve.
- [ ] Verify queued mail/background jobs are processed.
- [ ] Review logs for new errors.

## Deployment Script

Dry-run:

```bash
./deploy.sh
```

Execute:

```bash
HEALTH_URL=https://api.tiketa.example/up PHP_FPM_SERVICE=php8.3-fpm ./deploy.sh --execute
```

## Rollback Readiness

- [ ] Keep the previous release artifact available until post-deploy monitoring is clean.
- [ ] Keep database rollback/restore decision owner available.
- [ ] Keep queue worker restart access available.
- [ ] Follow `production-checklist.md` after rollback.
