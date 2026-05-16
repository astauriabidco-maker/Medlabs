# Security Audit - Public Surfaces

## Public endpoints kept by design

- `GET /api/health/*`: readiness/liveness only, no tenant or patient data.
- `GET /api/public/branding/:slug`: public laboratory branding only.
- `GET /api/pricing/public`: public commercial plans.
- `POST /api/partner-requests`: public lead capture, rate limited.
- `POST /api/auth/login`: credential exchange, rate limited, JWT delivered through httpOnly cookie.
- `POST /api/auth/request-password-reset`: email reset flow, rate limited.
- `POST /api/auth/reset-password`: token reset flow, rate limited.
- `POST /api/auth/guest/*`: signed guest token plus OTP/DOB/access-code proof, rate limited.
- `POST /api/patient/auth/*`: patient OTP portal flow, service-level rate limiting, JWT delivered through httpOnly `patient_access_token` cookie.
- `POST /api/payment/webhook`: provider callback only, HMAC signed in production.
- `GET /api/payment/providers`: public provider metadata only.
- `POST /api/appointments/book`, `GET /api/appointments/availability/:tenantId`, `GET /api/appointments/settings/:slug`: public booking surface.
- `GET /api/appointments/:id/ical`: appointment calendar export; keep under review if appointment IDs become guessable.
- `GET /api/connect/docs`: integration documentation only.
- `POST /api/api/webhooks/whatsapp`: Meta WhatsApp callback, signed with `X-Hub-Signature-256`.
- `POST /api/api/webhooks/twilio`: Twilio callback, signed with `X-Twilio-Signature`.

## Tenant/document isolation checks completed

- Result upload, preview, history, compare, resend, and delete force `tenantId` from the authenticated user.
- Payment guest status/initiate requires a signed `patient_payment` token scoped to the document.
- Payment admin verification now scopes transaction lookup by authenticated `tenantId`.
- Soft-deleted, purged, expired, and anonymized documents are excluded from guest payment and access flows.
- Patient portal document history and profile use the signed patient cookie and exclude soft-deleted, purged, and anonymized documents.
- `/api/admin/config` is restricted to `SUPER_ADMIN`.

## Watchlist

- `GET /api/appointments/:id/ical` remains unauthenticated. If appointment IDs are exposed outside patient messaging, add a signed calendar token.
- Public webhook callback URLs include the global `/api` prefix plus controller path. Current notification callback paths are `/api/api/webhooks/whatsapp` and `/api/api/webhooks/twilio`; keep provider dashboards exactly aligned.
