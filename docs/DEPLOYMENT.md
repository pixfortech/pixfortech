# Production deployment

Deployment branch: `codex/production-deployment`. The tested source branch remains unchanged.

## Infrastructure

- Netlify project: `pixfortech-production`; temporary hostname: `https://pixfortech-production.netlify.app`.
- Neon project: `pixfortech`; QA uses the separate `deployment-qa` database branch. Do not promote QA users or fixtures into the production database.
- Cloudflare R2 bucket: `pixfortech-private`, private, with a bucket-scoped Object Read & Write credential. The approved lifecycle rule expires abandoned `staging/` fragments after one day; completed uploads use a different prefix and are unaffected.
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

The inspected original SQLite database contained zero rows in all tables. It was preserved. A separate SQLite fixture database was imported into the QA branch and its rows verified. All QA password hashes were randomized before any remote QA use. The separate production branch now has all PostgreSQL migrations applied; the original SQLite import completed with a consistent backup and verified equality across all 24 original tables. No QA fixtures were imported into production, and the temporary app still points to the QA branch.

Never run the demo seed script against production. Bootstrap the owner's real account separately, with verified email and an owner-controlled password.

`scripts/bootstrap-owner.ts --create-first-owner` accepts `OWNER_EMAIL`, `OWNER_NAME` and the direct production connection. It locks and checks the account directory is empty, creates only the studio and first owner in a transaction, and refuses to overwrite existing accounts. The initial password is random and discarded; email remains unverified until the owner completes Better Auth verification. Use the normal password-reset flow to choose a password. Owner creation requires approval of the recipient and privileged role.

## Release gates

### Email DNS proposal — approval required before applying

Resend currently lists the following records for `pixfortech.com` at Namecheap (Tokyo sending region). None have been applied by this deployment workflow. Check existing records before applying the approved changes; preserve unrelated mail configuration.

| Type | Host | Value | TTL |
| --- | --- | --- | --- |
| TXT | `resend._domainkey` | Public DKIM key below | Auto |
| CNAME | `rsend` | `rsend-apne1.forge.rmta.net` | Auto |
| CNAME | `send` | `send.forge.rmta.net` | Auto |
| TXT, optional | `_dmarc` | `v=DMARC1; p=none;` | Auto |

Public DKIM TXT value (not a secret):

```text
p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCrlYYh5UmI2chfmAQn4f5XrN1Y4w1AvFbmo29whRT/wZufrRpBPGPP8i+6cFBjO54bGOZScv0CH6rghtdptGpAdtDEbR9FsUEGCth/f8pdiIavM+HOuoSACVW7Rd4z8GSIbMZHpncp5OcDBIipLHhIyy1RWcGy4qkRaeKMhhuT/QIDAQAB
```

The two CNAMEs are the sending/SPF records requested by this Resend configuration. Preserve the existing Namecheap email-forwarding SPF record at `@` (`v=spf1 include:spf.efwd.registrar-servers.com ~all`). The optional DMARC record is not part of the proposed cutover.

### Website DNS proposal — approval required before applying

Temporary-host QA has passed. Namecheap currently has `www` CNAME `parkingpage.namecheap.com.` (30 minutes) and `@` URL Redirect to `http://www.pixfortech.com/` (unmasked). Replace only those website records:

| Type | Host | Value | TTL |
| --- | --- | --- | --- |
| A | `@` | `75.2.60.5` | Automatic |
| CNAME | `www` | `pixfortech-production.netlify.app` | Automatic |

These values follow [Netlify's external DNS configuration](https://docs.netlify.com/manage/domains/configure-domains/configure-external-dns/). Attach both hostnames to the Netlify project, keep the apex canonical, and redirect `www` to it. Do not change registrar nameservers or unrelated mail records.

### Cutover sequence

1. Run TypeScript, lint, unit tests, production build and all browser suites.
2. Pass complete QA on the temporary Netlify hostname, including live email and private storage tests.
3. Obtain approval for exact website and Resend DNS records; do not change domain DNS before temporary QA passes.
4. Apply the production database schema, configure the real owner account, and select the production database connection.
5. Use `https://pixfortech.com` as canonical and redirect `www`. Update both public URL variables, trusted origins, email links and any Google callback to `/api/auth/callback/google` on the canonical origin.
6. Verify DNS and SSL, then rerun critical QA on the canonical hostname.

Current status: the temporary hostname is publicly deployed from the deployment branch. GitHub checkout and the Linux cloud build work. The optional Netlify branding overlay is disabled for this project. No domain DNS changes have been applied. The application still uses the isolated QA database; the production database is not populated. Live authentication emails to the approved account-owner inbox have passed. Temporary-host QA is complete; final hostname/database cutover awaits registrar access and approval of exact DNS records.

Temporary-host validation has passed core login/logout, role redirects, foreign project/request denial, live request status, private internal comments, chat, toasts and unread indicators. Private R2 boundary/ownership/download tests and chat/request attachment integration pass. Approval creation, client decisions and the audit trail pass. Project/task creation, authorized global search, internal-task exclusion and persisted profile/preferences pass. All 20 sitemap pages, the interactive 404 and observable reduced-motion/mobile public behavior pass. Production QA found and fixed delayed status publication, upload-size constraints, interaction readiness and an admin mobile grid overflow; final mobile, kanban and attachment regressions pass. Resend confirmed delivery of invitation verification, password setup, password reset and magic-link messages. Browser tests verified that unverified login is blocked, the verified invited team member sees no projects, old passwords fail after reset, old server sessions are revoked, reset and magic links are single-use, and logout ends the session.

## Validation and rollback

The latest validation includes 56 passing unit tests, type checking, lint and a successful production build. The display clock is supplied by the server for matching initial hydration, then advances on the client; its regression test covers a minute boundary. Calendar dates use UTC consistently. Browser notification permissions are read only after hydration. The final phone-width regression passes all ten admin/client pages without horizontal overflow or browser exceptions. Chat and request attachment upload/download regression passes on the same deployment. The deployed kanban check passes both explicit save completion and exact-task persistence after reload.

Attachment metadata uses the same current visibility rules across search, file lists, requests, tasks, approvals and chat. An isolated Neon integration test verifies visible/private files, a task becoming internal, an internal conversation, removed files and retained staff access. Its runner executes 57 passing tests in total (56 unit tests plus this integration test). Run it with `QA_DISPOSABLE_DATABASE=true` and the QA connection, using `node --env-file=.env.local node_modules/vitest/vitest.mjs run --config scripts/vitest.integration.config.mts`. It compares the target host with `.env.neon-production`, refuses production and removes only the exact fixture rows it created.

Local TypeScript, lint and 54 unit tests passed during implementation. The production Webpack build passed. `node scripts/flows-qa.mjs` passed 22/22 checks, including password reset and change, invitation plus email verification, unassigned staff isolation, uploads/downloads, executable rejection, approvals and kanban persistence. `node scripts/app-qa.mjs` passed with assertions for core role redirects, tenant isolation, toasts, unread counts, live request updates, internal-note privacy, realtime chat and logout. `node scripts/attachment-qa.mjs` passed chat and new-request attachment uploads with byte-identical authorized downloads. Email links in the local flow suite use the development transport; live Resend delivery was subsequently verified on the temporary hostname with the approved owner inbox. The public animation/behaviour suites have been exercised; the temporary-host production gate has passed; canonical-host QA remains required after DNS and SSL activation. `node scripts/storage-qa.mjs` passed with actual private R2 storage and Neon QA: exactly 25 MiB, rejection above the limit, chunk ownership, foreign-origin denial, byte-identical signed downloads, cross-tenant/anonymous denial and invalid magic-byte rejection. Keep individual results in local `artifacts/qa` and `data/deployment` logs; these may contain test tokens and must not be published.

Use Netlify's previous successful deploy to roll back application code. Preserve database compatibility and take a Neon branch/restore checkpoint before further schema changes. Do not restore old database state over new customer data. Keep the original SQLite source and backup until final migration acceptance.
