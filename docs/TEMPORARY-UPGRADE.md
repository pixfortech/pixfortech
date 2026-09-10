# Temporary experience deployment

This record supersedes the domain-cutover steps in DEPLOYMENT.md for this assignment. **Do not change DNS, attach the custom domains, or merge to main.** Domain cutover requires a separate owner-approved task.

## Source and deployment

- Branch: `codex/final-experience-upgrade`.
- Starting tested commit: `3d68a48c799681b31d9fbc7a2d4014a4fe3c9be4`.
- Application baseline: `7d79039fe02171d41c94187c4d849daaeae71a7e`, including merged email-delivery diagnostics. The subsequent upload-origin fix is `07950bb`; typecheck, lint and all 105 unit/integration checks passed. The full experience results below were recorded on the preceding application build `1a78d2a`.
- Candidate: https://codex-final-experience-upgrade--pixfortech-production.netlify.app
- Netlify project: `pixfortech-production`. The candidate build completed successfully.
- Existing deployment https://pixfortech-production.netlify.app remains on `codex/production-deployment`.
- Public previews were explicitly approved for this project. Better Auth still protects workspace data.

## Database and owner onboarding

The actual production Neon branch has all five migrations, including `0004_profile_identity.sql`. Read-only verification confirmed `username`, `public_slug`, `public_profile`, `experience`, and `profile_slug_history`. A separate pre-migration production branch preserves the previous state. No production reset, demo seed, SQLite import, destructive recovery, or production-file deletion was performed.

The full fixture-based browser QA used the separate `final-experience-qa` Neon clone. After the owner confirmed verification and password setup on September 10, only the final candidate's pooled and direct database variables were switched to the real production database. Build `6aa23408f68873a4c5df1396` completed successfully on commit `1c053d4`. No QA accounts or sample project records were copied into production.

On September 10, the owner explicitly approved the production identity. The real production check found no Super Admin, and the existing idempotent bootstrap created exactly one enabled `super_admin`. A second check confirmed it exists with email verification pending. No demo account was created.

Bootstrap used `--email-link` mode with the real production environment. The random temporary password was discarded; email verification and password setup remain required. It refuses to create another owner when any Super Admin already exists, including a disabled one. Complete onboarding through the delivered verification and password-reset links; never record the permanent password.

The separate `codex/owner-onboarding` branch uses the same tested application commit and real production database at https://codex-owner-onboarding--pixfortech-production.netlify.app. It allowed verification of the real owner before switching the final candidate, as requested. No custom domain or DNS change is involved.

Onboarding deployment `6aa23229ebddeff00b58c3f5` completed successfully. Fresh owner verification and password-set requests both returned HTTP 200. Resend's verification send log independently confirmed HTTP 200, and both messages have Sent and Delivered events on September 10 at 10:01 AM as displayed in its dashboard:

- Verification message: `e88b66b3-19e9-46bd-bf82-e2c7b79e2098`.
- Password-set message: `0065bfd2-92c0-48ec-a34d-bfcd3f948274`.

Both messages address the approved real owner and their private links target the onboarding hostname. Resend accepted the `onboarding@resend.dev` sender for this recipient; there was no sandbox rejection to fix. Delivered is the provider's delivery event, not proof the recipient has read the message. The owner subsequently confirmed both steps; a read-only production check confirmed `email_verified=true`, `must_change_password=false`, an enabled `super_admin` role and a credential record. The permanent password was never requested or read.

Production currently contains one user, one studio organisation and no projects. The owner signed in separately on the final hostname; its dashboard and team screen confirm the real owner and Super Admin access. Final-host profile, settings, files and notifications pages loaded; the readiness notification persisted, realtime connected, staff visiting `/portal` redirected to `/admin`, and the public header displayed the authenticated account control. No browser errors were reported in these checks. The permanent password remained private.

Upload-fix build `6aa236de2d35142125cddd2d` deployed commit `dcd0f68` successfully. All seven live authorization/origin checks passed: anonymous realtime/search/file access and same-origin uploads return 401, foreign-origin uploads return 403, and both workspace areas redirect anonymous visitors to login. Public home/work/login and anonymous session smoke checks also passed after the production switch.

Production infrastructure probes passed R2 write/read integrity, signed downloads, unsigned access denial (`400 InvalidArgument`) and forged-signature rejection (`403`). The non-personal probe objects use `staging/readiness/` and expire under the previously approved cleanup rule. A single owner-only in-app readiness notification was created using the existing service; persistence and realtime retrieval passed, while an unrelated user/organisation scope received none of that event. The owner's already-open onboarding UI received it live and showed one unread notification. No extra account was created. Full two-account project/file isolation remains evidenced by the isolated QA suite rather than by invented production tenants.

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
- Validate chunk-upload origins against the configured public application origin. A live same-origin anonymous probe exposed a proxy URL mismatch that incorrectly rejected legitimate uploads before authentication. Foreign/missing/malformed origins remain denied, forwarding headers cannot expand trust, and missing production origin configuration fails closed. Ten regression cases cover these boundaries.
- Update browser tests for the new confirmation field, current accessible labels, asynchronous saved-state feedback, and actual production game invitations. Assertions and security protections remain intact.

## Validation evidence

| Check | Result |
| --- | --- |
| TypeScript and lint | Clean |
| Unit tests | 88 passed |
| Combined integration run | 105 passed: 88 unit + 17 integration |
| Local experience browser suite | 65/65, no unexpected browser errors |
| Workflow browser suite | 23/23, including reset, invitation, file isolation, approvals and persisted kanban drag/drop |
| Live experience suite | 41/41, no unexpected browser errors; includes password change/restoration, notification reconciliation and all six mobile widths |
| Core live app suite | Passed on application commit `1a78d2a`, including role redirects, tenant denials, realtime requests/chat, internal-comment isolation and logout; no unexpected browser errors |
| Final real-production owner checks | Verified owner login/Super Admin, completed password setup, role routing, profile/settings/files, notification persistence, realtime connection and authenticated public header; no browser errors |
| Final production authorization/origin probes | 7 passed, including the corrected chunk-upload origin boundary |
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

- Review the real owner's profile content and preferences; verification, private password setup and final-host access are complete.
- Review legal entity name, monitored studio inbox, location, timezone, social links and founding year.
- Replace sample case studies with approved client names, project descriptions, imagery and substantiated outcomes.
- Confirm staff biographies, portraits and publication consent.
- Confirm open career roles, compensation and application details.
- Review contact response-time statements, service copy, privacy/terms and other factual business claims.
- Approve domain/DNS cutover and custom-domain transactional email in a separate task.

The production owner is working on the final temporary deployment. Content review and any later custom-domain/email-DNS cutover remain owner tasks; no DNS change or main merge was performed. The unrelated pre-existing `package-lock.json` worktree change was left untouched.

**The final temporary deployment is ready for owner content review. DNS has not been changed.**
