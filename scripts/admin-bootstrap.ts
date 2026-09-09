/**
 * Owner bootstrap.
 *
 *   npm run admin:check                       report whether an active super admin exists
 *   npm run admin:bootstrap                   create the first super admin if none exists
 *   npm run admin:bootstrap -- --require-verification --app=https://<deployed-origin>
 *                                             create the owner unverified and have the deployed app
 *                                             email its verification link (first sign-in waits for it)
 *
 * Inputs come from the environment (or --email= / --name= arguments), never
 * from source. Requires a direct DATABASE_URL_UNPOOLED. Idempotent: running
 * it twice creates nothing the second time. The temporary password is
 * printed exactly once, to this terminal, and nowhere else.
 */
import { existsSync } from "node:fs";
import { createPool, directUrl } from "./lib/pool";
import { runBootstrap } from "./lib/bootstrap";
import { requestVerificationEmail } from "./lib/resend";

if (existsSync(".env.local") && !process.env.DATABASE_URL_UNPOOLED && !process.env.DATABASE_URL) process.loadEnvFile(".env.local");

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
const check = process.argv.includes("--check");
const email = arg("email") ?? process.env.BOOTSTRAP_ADMIN_EMAIL;
const name = arg("name") ?? process.env.BOOTSTRAP_ADMIN_NAME;
const requireVerification = process.argv.includes("--require-verification") || process.env.BOOTSTRAP_ADMIN_REQUIRE_VERIFICATION === "true";
const app = arg("app") ?? process.env.NEXT_PUBLIC_APP_URL;

async function main() {
  const pool = createPool(directUrl());
  try {
    const result = await runBootstrap(pool, { email, name, check, requireVerification });
    if (result.action === "none") {
      console.log("No super admin exists. Run `npm run admin:bootstrap` with BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_NAME set to create one.");
    } else if (result.action === "exists") {
      console.log(`Super admin present (${result.admins.length}); nothing created.`);
      for (const a of result.admins) console.log(`  ${a.email}  enabled=${a.enabled}  emailVerified=${a.emailVerified}  since=${a.createdAt.slice(0, 10)}`);
    } else {
      console.log("");
      console.log("Super admin created. Sign in once with this temporary password; you will be asked to choose your own immediately.");
      console.log("It is not stored anywhere and will not be shown again.");
      console.log("");
      console.log(`  email:              ${result.email}`);
      console.log(`  temporary password: ${result.temporaryPassword}`);
      console.log("");
      console.log("Prefer not to use it? Use “Forgot password” on the sign-in page instead; that link also retires the temporary password.");
      if (!result.emailVerified) {
        console.log("");
        console.log("The account starts unverified: the sign-in form will refuse it until the verification link is opened.");
        if (app) {
          const r = await requestVerificationEmail(app, result.email);
          console.log(`Verification email requested from ${app}: HTTP ${r.status}. Confirm the send in that deployment's server log (\`[email] resend accepted id=…\`) and check delivery with \`npm run email:check -- --status=<id>\`.`);
          if (r.status >= 400) { console.error(r.body); process.exitCode = 1; }
        } else {
          console.log("No --app=<origin> was given, so nothing was emailed. Request the link with `npm run email:check -- --verify=<email> --app=<origin>` or use “Resend verification” on the sign-in page.");
        }
      }
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
