import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuthError, requireUser, type SessionUser } from "../auth/session";

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Wraps a server action with authentication, zod validation and uniform
 * error shaping so components never see stack traces. Every action re-reads
 * the session from the cookie; nothing from the client is trusted.
 */
export function action<S extends z.ZodTypeAny, T>(schema: S, handler: (input: z.infer<S>, user: SessionUser) => Promise<T>, opts: { revalidate?: string[] } = {}) {
  return async (raw: unknown): Promise<ActionResult<T>> => {
    let user: SessionUser;
    try { user = await requireUser(); } catch { return { ok: false, error: "Your session has expired. Sign in again." }; }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) { const k = String(issue.path[0] ?? "form"); if (!fieldErrors[k]) fieldErrors[k] = issue.message; }
      return { ok: false, error: "Please check the highlighted fields.", fieldErrors };
    }
    try {
      const data = await handler(parsed.data, user);
      for (const p of opts.revalidate ?? []) revalidatePath(p, "layout");
      return { ok: true, data };
    } catch (err) {
      if (err instanceof AuthError) return { ok: false, error: err.message };
      console.error("[action]", err);
      return { ok: false, error: "Something went wrong on our side. Please try again." };
    }
  };
}

export const dateInput = z.preprocess((v) => (v === "" || v === null || v === undefined ? null : typeof v === "string" ? new Date(v) : v), z.date().nullable());
export const optionalText = (max = 2000) => z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string().max(max).optional().or(z.literal("")));
