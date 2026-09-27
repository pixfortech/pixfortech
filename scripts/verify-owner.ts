/**
 * Owner email-verification repair (one-time, audited).
 *
 *   npm run admin:verify-owner -- --email=<owner>                    dry run: report what would change
 *   npm run admin:verify-owner -- --email=<owner> --user-id=<id> --reason="<evidence>" --confirm
 *
 * Use only after `npm run admin:check` shows the owner with emailVerified=false
 * AND the owner has demonstrably received mail at that address (e.g. opened a
 * reset link). The normal fix is the verification link or a password reset.
 * Never creates users, never changes roles, never touches passwords or sessions.
 */
import { existsSync } from "node:fs";
import { createPool, directUrl } from "./lib/pool";
import { verifyOwnerEmail } from "./lib/verify-owner";

if (existsSync(".env.local") && !process.env.DATABASE_URL_UNPOOLED && !process.env.DATABASE_URL) process.loadEnvFile(".env.local");

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");

async function main() {
  const pool = createPool(directUrl());
  try {
    const r = await verifyOwnerEmail(pool, { email: arg("email"), userId: arg("user-id"), reason: arg("reason"), confirm: process.argv.includes("--confirm") });
    if (r.action === "unchanged") console.log(`${r.email} (id=${r.id}) is already verified. Nothing changed.`);
    else if (r.action === "would-verify") console.log(`Dry run: ${r.email} (id=${r.id}) would be marked verified. Re-run with --user-id=${r.id} --reason="…" --confirm to apply.`);
    else console.log(`${r.email} (id=${r.id}) marked verified; audit event admin.email_verified_repair recorded.`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
