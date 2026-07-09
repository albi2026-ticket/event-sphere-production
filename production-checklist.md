# Tiketa Production Checklist

## Environment

- [ ] `APP_ENV=production`
- [ ] `APP_DEBUG=false`
- [ ] `APP_URL` uses HTTPS.
- [ ] `FRONTEND_URL` uses HTTPS.
- [ ] `SESSION_DOMAIN` matches the production domain.
- [ ] `SANCTUM_STATEFUL_DOMAINS` includes production frontend domains.
- [ ] Secrets are stored in the hosting secret manager, not committed files.

## Build And Dependencies

- [ ] Frontend build passes with `npm run build`.
- [ ] Backend install passes with `composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader`.
- [ ] Dev packages are not required at runtime.

## Database And Migrations

- [ ] Database host is in the expected production region.
- [ ] SSL is required where supported.
- [ ] Migrations are reviewed before `php artisan migrate --force`.
- [ ] Database backup/PITR is confirmed before migration.

## Optimization And Cache

- [ ] `php artisan config:cache`
- [ ] `php artisan route:cache`
- [ ] `php artisan event:cache`
- [ ] `php artisan view:cache`
- [ ] `php artisan optimize`
- [ ] PHP-FPM is reloaded when OPcache requires it.

## Queue

- [ ] `QUEUE_CONNECTION` is not `sync` in production.
- [ ] Queue workers are supervised by systemd, Supervisor, or the platform.
- [ ] Deploys run `php artisan queue:restart`.
- [ ] Failed jobs use `QUEUE_FAILED_DRIVER=database-uuids`.
- [ ] Failed jobs are reviewed and pruned on an operational schedule.

## Storage

- [ ] `FILESYSTEM_DISK` is production-safe.
- [ ] `EVENT_IMAGES_DISK` is production-safe.
- [ ] S3/object storage has versioning or equivalent protection.
- [ ] Local public storage is only used on single-node/shared-disk deployments.
- [ ] `public/storage` symlink is valid when local public storage is used.

## Permissions

- [ ] `backend/storage` is writable by the runtime user.
- [ ] `backend/bootstrap/cache` is writable during deploy/cache generation.
- [ ] Runtime cannot write application source files.
- [ ] File ownership matches the deployment model.

## Logging

- [ ] Logs rotate or ship centrally.
- [ ] Recommended baseline: `LOG_CHANNEL=stack`, `LOG_STACK=daily`, `LOG_DAILY_DAYS=14`.
- [ ] Container baseline: `LOG_STACK=stderr`.
- [ ] `LOG_LEVEL=warning` or stricter unless debugging a live incident.

## Health Check

- [ ] `/up` returns success.
- [ ] Public app root loads Tiketa.
- [ ] API responds to public read endpoints.
- [ ] Authentication flow reaches CSRF/session endpoints.
- [ ] Queued jobs are being consumed.
- [ ] No new critical errors appear in logs.

## Rollback Checklist

- [ ] Identify the last known-good release.
- [ ] Decide whether database rollback is required.
- [ ] Switch artifact/release symlink back to last known-good code.
- [ ] Run:

```bash
./rollback.sh --execute
```

- [ ] Reload PHP-FPM if not handled by the script.
- [ ] Restart queue workers if not handled by the script.
- [ ] Run health checks.
- [ ] Review logs and failed jobs.
- [ ] Document incident timeline and follow-up fixes.
