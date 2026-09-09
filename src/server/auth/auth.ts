import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { createAuthMiddleware } from "better-auth/api";
import { eq } from "drizzle-orm";
import { db, schema } from "../db";
import { sendEmail } from "../email";
import { ROLES } from "../db/schema";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const google = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  ? { google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET } }
  : {};

/**
 * Authentication is delegated to better-auth: password hashing (scrypt),
 * sessions in the database with secure httpOnly cookies, CSRF-safe origin
 * checks, email verification, password reset, magic links and optional
 * Google sign-in. Roles live on the user row and are enforced server-side
 * in src/server/auth/session.ts and the services.
 */
function createAuth() {
  if (process.env.NODE_ENV === "production" && (!process.env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET.length < 32)) throw new Error("A strong BETTER_AUTH_SECRET is required in production.");
  return betterAuth({
  appName: "Pixel Forge",
  baseURL: appUrl,
  trustedOrigins: [appUrl, ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean) ?? [])],
  secret: process.env.BETTER_AUTH_SECRET ?? (process.env.NODE_ENV === "production" ? undefined : "development-only-secret-change-me-please"),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user: schema.users, session: schema.sessions, account: schema.accounts, verification: schema.verifications, rateLimit: schema.rateLimit },
  }),
  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "client_member", input: false },
      organisationId: { type: "string", required: false, input: false },
      title: { type: "string", required: false },
      timezone: { type: "string", required: false },
      disabled: { type: "boolean", required: false, defaultValue: false, input: false },
      username: { type: "string", required: false, input: false },
      publicSlug: { type: "string", required: false, input: false },
      publicProfile: { type: "boolean", required: false, defaultValue: false, input: false },
      displayName: { type: "string", required: false, input: false },
      avatarKey: { type: "string", required: false, input: false },
      mustChangePassword: { type: "boolean", required: false, defaultValue: false, input: false },
    },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    minPasswordLength: 10,
    requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION !== "false",
    revokeSessionsOnPasswordReset: true,
    // A bootstrap-issued temporary password is retired by any successful reset.
    onPasswordReset: async ({ user }) => { await clearMustChangePassword(user.id); },
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({ to: user.email, subject: "Reset your Pixel Forge password", text: `Hello ${user.name},\n\nSomeone asked to reset the password for this account. If that was you, open the link below within the hour:\n\n${url}\n\nIf it was not you, ignore this email. The pixels are safe.` });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({ to: user.email, subject: "Verify your Pixel Forge email", text: `Hello ${user.name},\n\nConfirm this address to finish setting up your Pixel Forge account:\n\n${url}` });
    },
  },
  socialProviders: google,
  session: {
    expiresIn: 60 * 60 * 24 * 14,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: false },
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    database: { generateId: () => crypto.randomUUID() },
  },
  rateLimit: { enabled: true, window: 60, max: 30, storage: "database" },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      // A successful in-app password change also retires a temporary password.
      if (ctx.path === "/change-password" && ctx.context.session?.user?.id) await clearMustChangePassword(ctx.context.session.user.id);
    }),
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendEmail({ to: email, subject: "Your Pixel Forge sign-in link", text: `Open this link to sign in. It works once and expires shortly:\n\n${url}` });
      },
    }),
    nextCookies(),
  ],
});
}

async function clearMustChangePassword(userId: string) {
  await db.update(schema.users).set({ mustChangePassword: false, updatedAt: new Date() }).where(eq(schema.users.id, userId));
}

type Auth = ReturnType<typeof createAuth>;
let instance: Auth | undefined;

/** The auth instance is created on first use, not at import, so builds and tooling that never serve a request do not need the secret. */
export function getAuth(): Auth {
  if (!instance) instance = createAuth();
  return instance;
}

/** Same instance, addressed as a plain object for call sites (`auth.api.*`, `auth.handler`). */
export const auth: Auth = new Proxy({} as Auth, {
  get: (_, key) => Reflect.get(getAuth(), key),
  has: (_, key) => Reflect.has(getAuth(), key),
});

export type Session = Auth["$Infer"]["Session"];
export const roleValues = ROLES;
