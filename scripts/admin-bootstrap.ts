/**
 * Owner bootstrap.
 *
 *   npm run admin:check                       report whether an active super admin exists
 *   npm run admin:bootstrap                   create the first super admin if none exists
 *   npm run admin:bootstrap -- --email-link --app=https://<deployed-origin>
 *                                             create the owner unverified with no temporary password shown,
 *                                             and have the deployed app email its verification link
 *
 * Inputs come from the environment (or --email= / --name= arguments), never
 * from source. Requires a direct DATABASE_URL_UNPOOLED. Idempotent: running
 * it twice creates nothing the second time. The temporary password, when
 * used, is printed exactly once, to this terminal, and nowhere else.
 */
import { existsSync } from "node:fs";
import { createPool, directUrl } from "./lib/pool";
import { runBootstrap } from "./lib/bootstrap";
import { requestVerificationEmail } from "./lib/resend";

if (existsSync(".env.local") && !process.env.DATABASE_URL_UNPOOLED && !process.env.DATABASE_URL) process.loadEnvFile(".env.local");

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
const check = process.argv.includes("--check");
const emailLink = process.argv.includes("--email-link") || process.env.BOOTSTRAP_ADMIN_EMAIL_LINK === "true";
const email = arg("email") ?? process.env.BOOTSTRAP_ADMIN_EMAIL;
const name = arg("name") ?? process.env.BOOTSTRAP_ADMIN_NAME;
const app = arg("app") ?? process.env.NEXT_PUBLIC_APP_URL;

async function main() {
  const pool = createPool(directUrl());
  try {
    const result = await runBootstrap(pool, { email, name, check, emailLink });
    if (result.action === "none") {
      console.log("No super admin exists. Run `npm run admin:bootstrap` with BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_NAME set to create one.");
    } else if (result.action === "exists") {
      console.log(`Super admin present (${result.admins.length}); nothing created.`);
      for (const a of result.admins) console.log(`  ${a.email}  enabled=${a.enabled}  emailVerified=${a.emailVerified}  since=${a.createdAt.slice(0, 10)}`);
    } else if (!result.emailVerified) {
      console.log(`Super admin created for ${result.email} with an unverified email. The temporary password has been discarded.`);
      console.log("Sign-in is refused until the verification link is opened; then set the password with “Forgot password” on the sign-in page.");
      if (app) {
        const r = await requestVerificationEmail(app, result.email);
        console.log(`Verification email requested from ${app}: HTTP ${r.status}. Confirm the send in that deployment's server log (\`[email] resend accepted id=…\`) and check delivery with \`npm run email:check -- --status=<id>\`.`);
        if (r.status >= 400) { console.error(r.body); process.exitCode = 1; }
      } else {
        console.log("No --app=<origin> was given, so nothing was emailed. Request the link with `npm run email:check -- --verify=<email> --app=<origin>`, or sign in once with any password: a correct-password attempt resends it.");
      }
    } else {
      console.log("");
      console.log("Super admin created. Sign in once with this temporary password; you will be asked to choose your own immediately.");
      console.log("It is not stored anywhere and will not be shown again.");
      console.log("");
      console.log(`  email:              ${result.email}`);
      console.log(`  temporary password: ${result.temporaryPassword}`);
      console.log("");
      console.log("Prefer not to use it? Use “Forgot password” on the sign-in page instead; that link also retires the temporary password.");
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
