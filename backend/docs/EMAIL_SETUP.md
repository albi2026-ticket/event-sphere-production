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
```

`MAIL_FROM_ADDRESS` must use a domain verified in Resend.

## Verify Configuration

After deploying the variables, clear and rebuild Laravel config:

```bash
php artisan optimize:clear
php artisan config:cache
php artisan app:verify-mail
```

The verifier checks `MAIL_MAILER`, `RESEND_KEY`, `MAIL_FROM_ADDRESS`, and `MAIL_FROM_NAME`.

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
- Emails do not arrive: check Resend logs, spam folders, and the queued worker if the email is queued.
- Config looks stale: run `php artisan optimize:clear` and redeploy or restart the Railway service.
