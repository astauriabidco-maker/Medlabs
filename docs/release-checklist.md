# Production Release Checklist

## Environment

- Start production Compose with the env file explicitly loaded: `docker compose --env-file .env.production -f docker-compose.prod.yml up -d`.
- `NODE_ENV=production`.
- `FRONTEND_URL` contains every allowed browser origin, comma-separated.
- `AUTH_COOKIE_DOMAIN` matches the production parent domain, for example `.medlab.cm`.
- `AUTH_COOKIE_SAMESITE=lax` for same-site subdomains, or `none` only when a truly cross-site frontend is required.
- `AUTH_COOKIE_SECURE=true`.
- `TRUST_PROXY_HOPS=1` behind a single reverse proxy or load balancer.
- `JWT_SECRET`, `PATIENT_JWT_SECRET`, `PAYMENT_WEBHOOK_SECRET`, and S3 credentials are production-grade secrets.
- `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, and `S3_REGION` are set for the target S3-compatible storage.
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN` is configured in Meta webhook settings.
- `WHATSAPP_APP_SECRET` matches the Meta application secret used to sign `x-hub-signature-256`; `META_APP_SECRET` is accepted only as a compatibility alias.
- `TWILIO_AUTH_TOKEN` is configured if Twilio WhatsApp callbacks are enabled.
- `TWILIO_WEBHOOK_URL` exactly matches the callback URL configured in Twilio, including `/api/api/webhooks/twilio`.

## Database

- Run `npx prisma generate`.
- Run `npx prisma migrate deploy` against a disposable production-like database first.
- Verify the document soft-delete migration adds `deleted_at`, `purge_requested_at`, `purged_at`, and supporting indexes.

## Verification

- Backend targeted tests pass.
- Backend `npx tsc --noEmit` passes.
- Backend `npm run build` passes.
- Frontend `npx tsc --noEmit` passes.
- Frontend `npm run build` passes without PostCSS/Recharts warnings.
- Global lint is run and any legacy lint debt is triaged before release.

## Operations

- Confirm reverse proxy forwards `X-Forwarded-For`, `X-Forwarded-Proto`, and `X-Request-Id`.
- Confirm payment providers send one configured HMAC signature header: `X-MedLab-Signature`, `X-Payment-Signature`, `X-Campay-Signature`, `X-Orange-Signature`, or `X-Mtn-Signature`.
- Confirm Meta WhatsApp sends `X-Hub-Signature-256`.
- Confirm Twilio sends `X-Twilio-Signature`.
- Confirm patient portal auth uses the `patient_access_token` httpOnly cookie and no browser `localStorage` token.
- Confirm S3 delete failures create critical system alerts.
- Confirm logs include `requestId` for payment initiation, webhook, and paid events.
- Confirm dashboard alerting is monitored during the first purge/anonymization cron run.
