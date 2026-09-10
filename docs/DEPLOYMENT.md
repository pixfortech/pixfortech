# Production deployment

For the current experience upgrade, follow [TEMPORARY-UPGRADE.md](TEMPORARY-UPGRADE.md). Its temporary-only scope supersedes the DNS cutover instructions below; no DNS changes or main merge are authorized in this task.

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

## Profile identity and public pages

Migration `0004_profile_identity` adds username, public slug, publish flag, display name, bio, social links, avatar key, `must_change_password` and a small `experience` JSON column to `user`, plus `profile_slug_history` for permanent redirects. Only published, enabled staff accounts resolve at `/people/<slug>`; client accounts are private by design and never appear in listings, sitemap or redirects. Avatars are stored under `avatars/` in the private bucket and served through `/api/avatar/<id>` (public and cacheable only for published staff).

## Database migration

`npm run db:migrate` applies `drizzle/postgres` migrations using the direct connection. Set `DATABASE_PATH` to the intended SQLite source and run `npm run db:import-sqlite`. The import refuses a nonempty target, takes a consistent SQLite backup, checks integrity and foreign keys, imports in relationship order inside a PostgreSQL transaction, and compares every imported row before commit.

The inspected original SQLite database contained zero rows in all tables. It was preserved. A separate SQLite fixture database was imported into the QA branch and its rows verified. All QA password hashes were randomized before any remote QA use. The separate production branch now has all PostgreSQL migrations applied; the original SQLite import completed with a consistent backup and verified equality across all 24 original tables. No QA fixtures were imported into production, and the temporary app still points to the QA branch.

Never run the demo seed script against production. Bootstrap the owner's real account separately, with verified email and an owner-controlled password.

## Owner bootstrap

`npm run admin:check` reports whether an active `super_admin` exists (email, enabled, email verified) without changing anything. `npm run admin:bootstrap` creates the first owner only when no active super admin exists; it is idempotent, so a second run reports the existing account and creates nothing. Inputs come from `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_NAME` (or `--email=` / `--name=`), never from source, plus the direct `DATABASE_URL_UNPOOLED`. A missing or invalid email fails before touching the database. The script refuses to promote an existing account with that email.

The owner is created with `mustChangePassword` set and a 30-character random temporary password that is hashed with Better Auth's scrypt, printed exactly once to the terminal, and never stored or logged again. The first sign-in is forced to the profile page until the password is replaced; both the in-app change and the "Forgot password" flow clear the flag. Prefer the reset flow if you would rather not handle the temporary credential at all. Scenario tests (none exists, exists, run twice, missing email, credential handling, disabled owner, email-link onboarding) live in `scripts/admin-bootstrap.integration.test.ts` and run with `npm run test:integration` against a local PostgreSQL.

### Owner account runbook (production)

Run from a machine that holds the production secrets; nothing below is committed. Replace the placeholders; do not put the owner's name or address in any file.

```sh
export DATABASE_URL_UNPOOLED='<direct Neon production URL>'
npm run admin:check                                   # 1. inspect: lists any super admin, changes nothing
export BOOTSTRAP_ADMIN_EMAIL='<owner address>' BOOTSTRAP_ADMIN_NAME='<owner name>'
npm run admin:bootstrap -- --email-link --app='https://<temporary-netlify-host>'
                                                      # 2. create once, unverified, no temporary password shown;
                                                      #    asks the deployed app to email the verification link
export RESEND_API_KEY='<sending key>' EMAIL_FROM='<sender>'
npm run email:check -- --status='<id from the deployment log line "[email] resend accepted id=…">'
                                                      # 3. delivery event: delivered / bounced / …
```

`--email-link` (or `BOOTSTRAP_ADMIN_EMAIL_LINK=true`) creates the owner unverified and discards the random temporary password, so with `REQUIRE_EMAIL_VERIFICATION=true` the sign-in form refuses the account until the emailed link is opened, and the password is then set through "Forgot password". A correct-password sign-in attempt by an unverified account also triggers a fresh verification email. The link is requested from the deployed application through Better Auth's `send-verification-email` endpoint, which answers 200 for unknown or already verified addresses as well (no account enumeration); the deployment's server log carries the Resend message id, and `npm run email:check -- --status=<id>` reports the delivery event. If the account already exists the script refuses and creates nothing; if a super admin already exists it reports that account and creates nothing.

**Why a verification email may never arrive.** Until the sending domain is verified in Resend (which needs the DNS records listed above), `EMAIL_FROM` falls back to Resend's sandbox sender. The sandbox sender delivers only to the Resend account owner's own address and refuses every other recipient with `403 validation_error: You can only send testing emails to your own email address`. The application used to log that as a bare `Email API responded 403`; it now logs Resend's message and the recipient (masked) as `[email] resend rejected …`, and `npm run email:check -- --to=<address>` reproduces the refusal on demand with a one-line explanation. Two ways out that do not touch DNS: make the target inbox the Resend account's own address, or use a Resend account owned by that inbox. The third is the domain verification that waits on the approved DNS change.

### Switching the deployment from the QA database to production

1. In Netlify, set `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct) to the production Neon branch; leave the QA branch untouched so it can be re-attached.
2. Apply migrations against the direct URL: `npm run db:migrate`. Never run `npm run db:seed` or `npm run db:import-sqlite` here.
3. Trigger a deploy of the release branch and wait for it to finish.
4. `npm run admin:check` against production, then the runbook above if no owner exists.
5. Smoke test the temporary hostname: `node scripts/public-production-qa.mjs https://<host>` for the public routes and 404, a sign-in with the owner account, the forced password change, `/admin` rendering with live activity, an avatar upload (R2), a notification toast in a second session, and `npm run email:check -- --to=<owner address>` for email.

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

## Homepage content QA record (branch `codex/final-experience-upgrade`)

Owner-approved content only: company facts, founder, Kolkata, the studio inbox, LinkedIn and Instagram, and two public projects (Ganguram Sweets, SD18 Sports). Sample case studies, their cover art and the "sample layout" copy paths were removed; the third work slot is an explicit call to action. Services were renamed to the approved six (e-commerce, graphic design and website redesign replace Shopify, web applications and UI/UX), with new slugs in the sitemap. The hero headline moved one step down the type scale so the longer approved line fits above the fold.

| Check | Result |
| --- | --- |
| `npm run typecheck`, `npm run lint` | clean |
| `npm test` | 107 passed |
| `npm run test:integration` against the local QA cluster | 123 passed; `scripts/file-metadata-qa.test.ts` still needs `QA_DISPOSABLE_DATABASE=true` and the QA/production identity files |
| `npm run build` | clean |
| `node scripts/public-production-qa.mjs` on the production build | 24 public routes incl. both project studies and six service pages, sitemap, interactive 404, reduced motion, mobile menu, no overflow |
| `node scripts/experience-qa.mjs` | 117 checks; hero pointer probes now aim at the block, right of the longer headline |
| Visual review at 320, 360, 375, 390, 430, 768 and 1366 | no overflow, no clipped headings, PiP bubbles clear of copy, CTA card reads as a CTA |

## Forge gate QA record (branch `codex/pip-login-experience`)

A brand layer over the existing Better Auth flows: no change to sign-in, reset, verification or session handling beyond a password visibility toggle, a 650 ms beat before the post-login redirect, and sign-out landing on `/login?signedout=1` instead of the home page. The corner mascot no longer mounts on auth pages; the gate PiP replaces it there.

| Check | Result |
| --- | --- |
| `npm run typecheck`, `npm run lint` | clean |
| `npm test` (gatekeeper faces distinct and privacy poses eyeless, reducer transitions incl. password typing invariance, shown-password rule, failure/success, reset/magic/verify flows, doze/wake, line categories original and non-mocking) | passing |
| `node scripts/experience-qa.mjs` gate section: idle greeting, email focus and typing faces, peek then covered eyes, no face change across typed characters, show/hide password, wrong password with the real error intact, success before redirect, no repeated lines, forgot/reset-sent/reset/invalid/verify/verify-error/reset-complete states, keyboard poke and tab order, reduced motion, phone strip and tap, gate clear of the form at 320/360/375/390/430/768, sign-out lands on the waving gate | 117 of 117 checks, no browser errors |
| `node scripts/flows-qa.mjs` (reset, single-use links, invitation with verification, isolation, uploads, approvals, kanban) and `node scripts/app-qa.mjs` (role redirects, tenant denials, realtime, sign-out) | flows 23 of 23; app suite passed |
| Lighthouse 13 mobile, `/login`, production build | 93 / 98 performance across two runs, accessibility 100, best practices 100, CLS 0 (88 on this machine before the gate) |

## PiP's bench QA record (branch `codex/pip-precision-builder`)

A contained addition to the home page's first section; no auth, database, admin, realtime, storage, DNS or scroll-forge change. Run locally against the dev server with the demo fixtures.

| Check | Result |
| --- | --- |
| `npm run typecheck`, `npm run lint` | clean |
| `npm test` (bench rotation, pieces, full cycles, misplacement corrected before placement, speech limits, poke, phone pool, pointer behaviour) | passing, 10 new tests |
| `node scripts/experience-qa.mjs` bench section: live on desktop, no heading overlap, ten cycles at 8x with every phase seen, no back-to-back repeat and a full cycle of distinct pieces, unique line ids, hover, pointer leave, click, keyboard Enter, pause when scrolled away, resume, reduced motion static frame, phone arrangement, touch tap, bench clear of the heading at 320/360/375/390/430/768 | 85 of 85 checks; the only console error across the run is a 429 from the sign-in rate limit that the suite's repeated logins trigger, unrelated to the bench |
| Lighthouse 13 mobile, home, production builds of both branches served side by side on the same machine, three alternating samples each | baseline 85 / 83 / 75 (median 83, TBT 340–400 ms, LCP 3.2–3.9 s); with the bench 69 / 82 / 86 (median 82, TBT 330–580 ms, LCP 3.0–4.1 s); accessibility, best practices and SEO 100 on both. The spread is machine noise: the bench code loads only within half a viewport of its section and starts only after the page has settled, so it is not part of the audited window |

Creative review: PiP reads as PiP at every size, the ruler and dashed snap lines make the check legible without words, the slot grid appears only while placing, finished pieces shelve at half size top right, and the phone layout is a separate 26 by 14 arrangement with the smaller pieces only.

## Experience upgrade QA record (branch `codex/final-experience-upgrade`)

Run against an isolated local PostgreSQL 16 with the demo fixture import, never against production. Production credentials (Neon, R2, Resend, Netlify) were not available in the build environment, so the Netlify deploy, live email, R2 and production-database checks are still owner steps; the code paths involved (better-auth email hooks, S3 driver, Neon HTTP driver) are unchanged by this branch except where noted.

| Check | Result |
| --- | --- |
| `npm run typecheck`, `npm run lint` | clean |
| `npm test` (unit, 9 files) | 75 passed |
| `npm run test:integration` with `DATABASE_URL` pointing at the local cluster (profile slugs, owner bootstrap scenarios) | passed; `scripts/file-metadata-qa.test.ts` additionally needs `QA_DISPOSABLE_DATABASE=true` and the QA/production identity files, as before |
| `npm run admin:check`, `npm run admin:bootstrap` (existing owner), `npm run email:check` (no key, usage), `--verify` against the local dev server | CLI paths exercised; the app emitted its verification email for a temporarily unverified fixture user |
| `node scripts/experience-qa.mjs` (login entry, account menu, profile identity, slug redirect 308, avatar, password, hero mouse/touch/keyboard/secret, PiP hide/restore/non-repetition/offline, five games and rotation, two-session realtime, mobile 320–768) | 64 of 64 passed |
| `node scripts/workspace-qa.mjs`, `node scripts/public-production-qa.mjs` (existing production suites) | all passed |
| Lighthouse, production build, mobile emulation | home 88 / 100 / 100 / 100 (baseline 88); work 92 / 100 / 100 / 100 (baseline 98); login 88 / 100 / 100 (noindex by design); admin, warm, 81 / 100 / 96 (baseline 81), TBT 280 ms (baseline 350 ms) |

Notes: the work page lost a few performance points to the header scene (LCP 2.9 s vs 2.3 s) and the login page's SEO score reflects its intentional `noindex`. The admin dashboard's first hit after a cold start audits lower (72) because the route compiles on demand; the warm figure above is the representative one.

