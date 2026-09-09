# Production deployment

Deployment branch: `codex/production-deployment`. The tested source branch remains unchanged.

## Infrastructure

- Netlify project: `pixfortech-production`; temporary hostname: `https://pixfortech-production.netlify.app`.
- Neon project: `pixfortech`; QA uses the separate `deployment-qa` database branch. Do not promote QA users or fixtures into the production database.
- Cloudflare R2 bucket: `pixfortech-private`, private, with a bucket-scoped Object Read & Write credential.
- Resend: sending-only credential. Domain verification is pending approved DNS changes. The temporary sender is Resend's sandbox sender, which only delivers to the account owner.
- Better Auth retains email/password, database sessions, verification, reset, magic links and optional Google OAuth. Server services enforce roles and tenant membership on every operation.
- Realtime uses a durable PostgreSQL event log with authenticated short polling (2 seconds foreground, 15 seconds background), preserving the existing event/audience abstraction. Reads refresh the user's permissions and project membership. Events expire after 24 hours; delivery overlap and deduplication cover reconnects. Polling consumes database and function usage; review free-tier usage as activity grows.
- Uploads use authenticated 3 MiB chunks so files up to 25 MiB fit serverless request limits. Final assembly rechecks project access, full-file size and existing MIME/magic-byte rules. Downloads require current authorization before issuing a short-lived R2 URL. Internal task/conversation attachments remain private.

## Secrets and configuration

Store secrets in Netlify environment variables, never Git:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Pooled Neon application connection |
| `DATABASE_URL_UNPOOLED` | Direct migration connection; needed only by migration tooling |
| `BETTER_AUTH_SECRET` | Random authentication secret, at least 32 characters |
| `FILE_URL_SECRET` | Independent random file-link signing secret |
| `RESEND_API_KEY` | Sending-only Resend key |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Bucket-scoped private R2 credential |
| `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL` | Current deployment origin |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Comma-separated allowed authentication origins |
| `REQUIRE_EMAIL_VERIFICATION` | `true` in production |
| `STORAGE_DRIVER` | `s3` in production |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION` | R2 endpoint, private bucket and `auto` region |
| `EMAIL_FROM`, `ENQUIRY_FROM`, `ENQUIRY_TO` | Verified senders and enquiry recipient |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Optional OAuth credentials |

Production fails closed when required storage/authentication secrets are absent. Build tracing excludes local databases, uploads, environment files and QA artifacts.

## Database migration

`npm run db:migrate` applies `drizzle/postgres` migrations using the direct connection. Set `DATABASE_PATH` to the intended SQLite source and run `npm run db:import-sqlite`. The import refuses a nonempty target, takes a consistent SQLite backup, checks integrity and foreign keys, imports in relationship order inside a PostgreSQL transaction, and compares every imported row before commit.

The inspected original SQLite database contained zero rows in all tables. It was preserved. A separate SQLite fixture database was imported into the QA branch and its rows verified. All QA password hashes were randomized before any remote QA use.

Never run the demo seed script against production. Bootstrap the owner's real account separately, with verified email and an owner-controlled password.

## Release gates

1. Run TypeScript, lint, unit tests, production build and all browser suites.
2. Pass complete QA on the temporary Netlify hostname, including live email and private storage tests.
3. Obtain approval for exact website and Resend DNS records; do not change domain DNS before temporary QA passes.
4. Apply the production database schema, configure the real owner account, and select the production database connection.
5. Use `https://pixfortech.com` as canonical and redirect `www`. Update both public URL variables, trusted origins, email links and any Google callback to `/api/auth/callback/google` on the canonical origin.
6. Verify DNS and SSL, then rerun critical QA on the canonical hostname.

Current status: release gates are not complete. No domain DNS changes have been applied. The deployment branch is pushed. The Netlify repository setting points to it, but cloud checkout requires completing the normal GitHub connection in Netlify. The first cloud build stopped before cloning; it did not deploy an application.

## Validation and rollback

Local TypeScript, lint and 54 unit tests passed during implementation. The production Webpack build passed. `node scripts/flows-qa.mjs` passed 22/22 checks, including password reset and change, invitation plus email verification, unassigned staff isolation, uploads/downloads, executable rejection, approvals and kanban persistence. Email links in this local suite use the development transport; live Resend delivery remains a separate production gate. The public animation/behaviour suites and core authenticated flows have been exercised; full temporary-host production QA is still pending. `node scripts/storage-qa.mjs` passed with actual private R2 storage and Neon QA: exactly 25 MiB, rejection above the limit, chunk ownership, foreign-origin denial, byte-identical signed downloads, cross-tenant/anonymous denial and invalid magic-byte rejection. Keep individual results in local `artifacts/qa` and `data/deployment` logs; these may contain test tokens and must not be published.

Use Netlify's previous successful deploy to roll back application code. Preserve database compatibility and take a Neon branch/restore checkpoint before further schema changes. Do not restore old database state over new customer data. Keep the original SQLite source and backup until final migration acceptance.
