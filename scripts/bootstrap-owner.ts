import { randomBytes, randomUUID } from "node:crypto";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { hashPassword } from "better-auth/crypto";
import ws from "ws";

// One-time, explicit bootstrap. Never imports fixtures or replaces an account.
const email = process.env.OWNER_EMAIL?.trim().toLowerCase();
const name = process.env.OWNER_NAME?.trim();
const connectionString = process.env.DATABASE_URL_UNPOOLED;
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name || !connectionString) {
  throw new Error("OWNER_EMAIL, OWNER_NAME and a direct DATABASE_URL_UNPOOLED are required.");
}
if (!process.argv.includes("--create-first-owner") || new URL(connectionString).hostname.includes("-pooler")) {
  throw new Error("Use a direct connection and explicitly acknowledge --create-first-owner.");
}
neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString });
try {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query('LOCK TABLE "user", organisations IN EXCLUSIVE MODE');
    const counts = await client.query('SELECT (SELECT count(*) FROM "user")::int AS users, (SELECT count(*) FROM organisations)::int AS organisations');
    if (counts.rows[0].users || counts.rows[0].organisations) throw new Error("Bootstrap requires an empty account directory; nothing was overwritten.");
    const orgId = randomUUID();
    const userId = randomUUID();
    // Discard the initial password. The owner must verify email and choose a password through Better Auth.
    const password = await hashPassword(randomBytes(48).toString("base64url"));
    await client.query("INSERT INTO organisations (id,name,slug,kind,website) VALUES ($1,$2,$3,'studio',$4)", [orgId, "Pixel Forge Technologies", "pixel-forge", "https://pixfortech.com"]);
    await client.query('INSERT INTO "user" (id,name,email,email_verified,role,organisation_id) VALUES ($1,$2,$3,false,\'super_admin\',$4)', [userId, name, email, orgId]);
    await client.query("INSERT INTO account (id,account_id,provider_id,user_id,password) VALUES ($1,$2,'credential',$2,$3)", [randomUUID(), userId, password]);
    await client.query("COMMIT");
    console.log("First owner created with unverified email and no exposed initial password. Complete Better Auth email verification and password setup.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
} finally { await pool.end(); }
