import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db, schema } from "../db";
import { uid } from "./ids";
import { publish } from "../realtime/bus";
import { sendEmail } from "../email";

export type NotificationCategory = "message" | "request" | "task" | "approval" | "project" | "mention" | "file" | "milestone" | "due";
export const NOTIFICATION_CATEGORIES: { key: NotificationCategory; label: string; hint: string }[] = [
  { key: "message", label: "Messages", hint: "New messages in project chats and request threads." },
  { key: "mention", label: "Mentions", hint: "Someone mentioned you by name." },
  { key: "request", label: "Requests", hint: "New change requests, status changes and comments." },
  { key: "task", label: "Tasks", hint: "Tasks assigned to you or completed on your projects." },
  { key: "approval", label: "Approvals", hint: "Approvals requested from you and decisions made." },
  { key: "milestone", label: "Milestones", hint: "Milestones completed or awaiting approval." },
  { key: "file", label: "Files", hint: "New attachments on your projects." },
  { key: "project", label: "Project updates", hint: "Status and phase changes." },
  { key: "due", label: "Due dates", hint: "Reminders for approaching deadlines." },
];

export type Prefs = Record<NotificationCategory, { inApp: boolean; email: boolean; browser: boolean }>;
export const defaultPrefs = (): Prefs => Object.fromEntries(NOTIFICATION_CATEGORIES.map((c) => [c.key, { inApp: true, email: ["approval", "mention", "request"].includes(c.key), browser: false }])) as Prefs;

export function getPrefs(userId: string): { prefs: Prefs; browserOptIn: boolean } {
  const row = db.select().from(schema.notificationPreferences).where(eq(schema.notificationPreferences.userId, userId)).get();
  if (!row) return { prefs: defaultPrefs(), browserOptIn: false };
  try { return { prefs: { ...defaultPrefs(), ...(JSON.parse(row.settings) as Prefs) }, browserOptIn: row.browserOptIn }; } catch { return { prefs: defaultPrefs(), browserOptIn: row.browserOptIn }; }
}

export function savePrefs(userId: string, prefs: Prefs, browserOptIn: boolean) {
  db.insert(schema.notificationPreferences).values({ userId, settings: JSON.stringify(prefs), browserOptIn })
    .onConflictDoUpdate({ target: schema.notificationPreferences.userId, set: { settings: JSON.stringify(prefs), browserOptIn, updatedAt: new Date() } }).run();
}

/**
 * Creates persistent notifications for each recipient (respecting in-app
 * preferences), publishes a realtime event per recipient, and emails when
 * the recipient opted in for the category.
 */
export async function notify(input: {
  recipientIds: string[]; category: NotificationCategory; title: string; body?: string; href?: string;
  projectId?: string | null; actorId?: string | null; excludeActor?: boolean;
}) {
  const recipients = [...new Set(input.recipientIds)].filter((id) => !(input.excludeActor !== false && id === input.actorId));
  if (!recipients.length) return;
  const actor = input.actorId ? db.select({ name: schema.users.name }).from(schema.users).where(eq(schema.users.id, input.actorId)).get() : null;
  for (const userId of recipients) {
    const { prefs } = getPrefs(userId);
    const pref = prefs[input.category] ?? { inApp: true, email: false, browser: false };
    if (!pref.inApp && !pref.email) continue;
    const id = uid();
    if (pref.inApp) {
      db.insert(schema.notifications).values({ id, userId, category: input.category, title: input.title, body: input.body ?? null, href: input.href ?? null, projectId: input.projectId ?? null, actorId: input.actorId ?? null }).run();
      publish({ type: "notification", audience: { userIds: [userId] }, payload: { id, category: input.category, title: input.title, body: input.body ?? null, href: input.href ?? null, actorName: actor?.name ?? null, projectId: input.projectId ?? null, browser: pref.browser } });
    }
    if (pref.email) {
      const u = db.select({ email: schema.users.email, name: schema.users.name }).from(schema.users).where(eq(schema.users.id, userId)).get();
      if (u) {
        const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
        void sendEmail({ to: u.email, subject: `[Pixel Forge] ${input.title}`, text: `${input.body ?? input.title}\n\n${input.href ? base + input.href : ""}` }).catch((err) => console.error("[notify] email failed", err));
      }
    }
  }
}

export function listNotifications(userId: string, limit = 30) {
  return db.select({
    id: schema.notifications.id, category: schema.notifications.category, title: schema.notifications.title, body: schema.notifications.body, href: schema.notifications.href,
    readAt: schema.notifications.readAt, createdAt: schema.notifications.createdAt, actorName: schema.users.name, actorImage: schema.users.image, projectTitle: schema.projects.title,
  }).from(schema.notifications)
    .leftJoin(schema.users, eq(schema.users.id, schema.notifications.actorId))
    .leftJoin(schema.projects, eq(schema.projects.id, schema.notifications.projectId))
    .where(eq(schema.notifications.userId, userId)).orderBy(desc(schema.notifications.createdAt)).limit(limit).all();
}

export function unreadCount(userId: string): number {
  const row = db.select({ n: sql<number>`count(*)` }).from(schema.notifications).where(and(eq(schema.notifications.userId, userId), isNull(schema.notifications.readAt))).get();
  return row?.n ?? 0;
}

export function markRead(userId: string, id: string) {
  db.update(schema.notifications).set({ readAt: new Date() }).where(and(eq(schema.notifications.id, id), eq(schema.notifications.userId, userId))).run();
}
export function markAllRead(userId: string) {
  db.update(schema.notifications).set({ readAt: new Date() }).where(and(eq(schema.notifications.userId, userId), isNull(schema.notifications.readAt))).run();
}
