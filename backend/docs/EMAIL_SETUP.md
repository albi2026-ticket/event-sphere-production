# Tiketa Email Setup

Tiketa sends application email through Laravel Mail. Production delivery uses Resend.

## Create a Resend Account

1. Create or sign in to a Resend account.
2. Add and verify the sending domain you will use for Tiketa email.
3. Complete the DNS records Resend provides for the domain.
4. Create an API key with permission to send email.

## Railway Variables

Set these variables on the Railway backend service:

```env
MAIL_MAILER=resend
RESEND_KEY=re_...
MAIL_FROM_ADDRESS=hello@your-domain.com
MAIL_FROM_NAME=Tiketa
QUEUE_CONNECTION=sync
```

`MAIL_FROM_ADDRESS` must use a domain verified in Resend.

`QUEUE_CONNECTION=sync` is the safest setting for a single Railway web service because Tiketa has several mail flows that call Laravel's queued mail API. With `sync`, those messages are delivered inline by the web process. If you set `QUEUE_CONNECTION=redis` or `database`, deploy a separate Railway worker that runs:

```bash
php artisan queue:work redis --queue=default --sleep=1 --tries=3 --backoff=5 --timeout=60
```

## Verify Configuration

After deploying the variables, clear and rebuild Laravel config:

```bash
php artisan optimize:clear
php artisan config:cache
php artisan app:verify-mail
```

The verifier checks `MAIL_MAILER`, `RESEND_KEY`, `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME`, and whether queued mail needs a worker.

## Send a Test Email

Use Tinker from the Railway shell or a trusted production shell:

```bash
php artisan tinker
```

Then run:

```php
Mail::raw('Tiketa email delivery test.', fn ($message) => $message->to('you@example.com')->subject('Tiketa email test'));
```

Check the recipient inbox and the Resend dashboard logs.

## Troubleshooting

- `RESEND_KEY is not configured`: add `RESEND_KEY` to Railway and run `php artisan config:cache`.
- `MAIL_MAILER must be set to [resend]`: set `MAIL_MAILER=resend` in Railway.
- Emails are rejected by Resend: confirm `MAIL_FROM_ADDRESS` uses a verified Resend domain.
- Emails do not arrive: check Resend logs, Railway logs for `Preparing email`, `Sending email`, `Email successfully sent`, and `Email failed`, then confirm `QUEUE_CONNECTION=sync` or that a queue worker is running.
- Config looks stale: run `php artisan optimize:clear` and redeploy or restart the Railway service.
