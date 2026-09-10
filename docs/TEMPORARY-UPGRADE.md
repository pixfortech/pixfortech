# Temporary experience deployment

This record supersedes the domain-cutover steps in DEPLOYMENT.md for this assignment. **Do not change DNS, attach the custom domains, or merge to main.** Domain cutover requires a separate owner-approved task.

## Source and deployment

- Branch: `codex/final-experience-upgrade`.
- Starting tested commit: `3d68a48c799681b31d9fbc7a2d4014a4fe3c9be4`.
- Application commit: `1a78d2a3d6153335e68d3689ab6f74d79b146af1`.
- Candidate: https://codex-final-experience-upgrade--pixfortech-production.netlify.app
- Netlify project: `pixfortech-production`. The candidate build completed successfully.
- Existing deployment https://pixfortech-production.netlify.app remains on `codex/production-deployment`.
- Public previews were explicitly approved for this project. Better Auth still protects workspace data.

## Database and owner onboarding

The actual production Neon branch has all five migrations, including `0004_profile_identity.sql`. Read-only verification confirmed `username`, `public_slug`, `public_profile`, `experience`, and `profile_slug_history`. A separate pre-migration production branch preserves the previous state. No production reset, demo seed, SQLite import, destructive recovery, or production-file deletion was performed.

Browser QA uses the separate `final-experience-qa` Neon clone. **The candidate currently uses that QA clone, not the owner production database.** Test accounts and sample project records must never be promoted into production.

The production Super Admin check found no account. Owner identity requires explicit confirmation: automatic approval review rejected inferring that privileged identity from the Netlify account. No production owner has been created and no production password setup has occurred.

After approval, use the idempotent bootstrap's `--email-link` mode with the real production environment. This discards the random temporary password, leaves email verification required, and requires password setup. It refuses to create another owner when any Super Admin already exists, including a disabled one. Complete onboarding through the delivered verification and password-reset links; never record the permanent password.

After QA and owner onboarding, securely point only the candidate branch's pooled and direct database variables to the actual production branch, rebuild, and verify the owner workspace and public site. Preserve the working existing deployment.

## Production configuration

The candidate has branch-scoped configuration for authentication, the temporary application/site origin, trusted origins, pooled/direct PostgreSQL, Resend, private R2, and signed files. Secrets remain outside Git. Runtime uses the pooled connection; migration tooling uses the matching direct connection.

Resend currently uses `onboarding@resend.dev`; the unverified custom domain cannot send general client mail. Test delivery is limited to the approved owner inbox. Custom-domain email verification and DNS changes remain outside this assignment.

R2 remains private with bucket-scoped credentials. Its approved cleanup rule removes only abandoned `staging/` fragments after one day. Completed files are outside that prefix. Authorization, MIME/magic-byte checks and the 25 MiB limit remain enforced.

Realtime uses the existing PostgreSQL-backed event log and authenticated polling abstraction. Each poll rechecks session, role, tenant and project membership. Resource IDs and delivery IDs are now separate, preventing duplicated notification rows without dropping successive updates to the same resource.

## Fixes found during QA

- Prevent mobile-menu taps and request-form input from being lost before hydration.
- Remove a narrow-screen overflow in the admin project pulse.
- Make the bootstrap executable under the repository's TypeScript runtime and support verified-email onboarding without exposing a temporary password.
- Preserve notification resource IDs independently of delivery IDs.
- Use the shared server display clock in the live activity feed, avoiding hydration mismatches across minute boundaries.
- Send a new verification email after a correct-password sign-in by an unverified user; access remains denied until verification succeeds.
- Update browser tests for the new confirmation field, current accessible labels, asynchronous saved-state feedback, and actual production game invitations. Assertions and security protections remain intact.

## Validation evidence

| Check | Result |
| --- | --- |
| TypeScript and lint | Clean |
| Unit tests | 78 passed |
| Combined integration run | 95 passed: 78 unit + 17 integration |
| Local experience browser suite | 65/65, no unexpected browser errors |
| Workflow browser suite | 23/23, including reset, invitation, file isolation, approvals and persisted kanban drag/drop |
| Live experience suite | 41/41, no unexpected browser errors; includes password change/restoration, notification reconciliation and all six mobile widths |
| Core live app suite | Passed on application commit `1a78d2a`, including role redirects, tenant denials, realtime requests/chat, internal-comment isolation and logout; no unexpected browser errors |
| Live profile/privacy/security suite | 24 checks passed |
| Production mini-games | 36 checks passed across all five games |
| Public QA | 22 routes, sitemap, interactive 404, reduced motion, mobile menu and overflow checks passed |
| Workspace QA | Project/task creation, authorized search, preferences and admin/client mobile layouts passed |
| Private storage | 25 MiB boundary, chunk ownership, origin denial, byte integrity, signed download, cross-tenant/anonymous denial and magic-byte validation passed |
| Attachments | Chat and new-request private attachments and authorized downloads passed |
| Scene review | 10 distinct PiP compositions, unique interactive 404, and public staff page checked |
| Existing visual scripts | Forge, pixel, mascot and behavior scripts completed; they include diagnostic observations rather than counted assertions |

Mobile experience coverage includes 320, 360, 375, 390, 430 and 768 pixels. Profile checks cover persistence, username validation/uniqueness, roles, publishing, anonymous denial after unpublishing, noindex previews, sitemap removal, metadata and canonical URLs. Slug-change QA verifies the old address returns a permanent 308 redirect. Client project, request, file, conversation and approval access is denied across tenants.

Live email QA confirmed password reset, old-password rejection, server-session revocation, reset-link single use, magic-link single use, role redirects and logout. On September 10, a fresh verification email was delivered through Resend to the approved QA inbox. Its link verified the isolated account, which retained zero project access. Signing out and then signing in with the existing password succeeded on the candidate. The QA email account is now verified; production owner onboarding remains separate and incomplete.

Local HTTP-to-Neon connection resets interrupted some earlier test attempts. The clean local runs used the application's supported PostgreSQL driver against the same isolated clone. Netlify continues to use its serverless Neon HTTP runtime. Earlier failed attempts are retained in the operational history; they were not counted as passes.

A live experience attempt was interrupted by an `ECONNRESET` during an anonymous profile privacy probe. Read-only API probes now allow two retries for that transport error using Playwright's built-in option; HTTP failures are not retried, and all privacy/status assertions remain unchanged. A previous password-restoration confirmation timed out; the QA password was recovered through the normal authenticated change-password UI, and the next run passed both password changes. That earlier failure is not counted as a pass.

## Performance

Lighthouse 13.4.1 mobile audits on the temporary production build:

| Page | Performance | Accessibility | Best practices |
| --- | ---: | ---: | ---: |
| Home | 87 | 100 | 100 |
| Work | 100 | 100 | 100 |
| Login | 100 | 100 | 100 |
| Authenticated Admin | 92 | 100 | 100 |

Previous reported performance values were Home 88, Work 92, Login 88 and Admin 81. These runs show no major regression. Login's lower SEO score reflects intentional noindex. Reports are stored locally in ignored `artifacts/qa/lighthouse/`; authenticated reports must not be published as public artifacts.

## OWNER_VERIFY

- Confirm the privileged production owner identity and complete email/password onboarding.
- Review legal entity name, monitored studio inbox, location, timezone, social links and founding year.
- Replace sample case studies with approved client names, project descriptions, imagery and substantiated outcomes.
- Confirm staff biographies, portraits and publication consent.
- Confirm open career roles, compensation and application details.
- Review contact response-time statements, service copy, privacy/terms and other factual business claims.
- Approve domain/DNS cutover and custom-domain transactional email in a separate task.

**Not yet ready for final owner content review:** production owner onboarding, candidate production-database selection and final owner-account checks remain outstanding. DNS has not been changed.
