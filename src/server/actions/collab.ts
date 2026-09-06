"use server";

import { z } from "zod";
import { action, dateInput, optionalText } from "./shared";
import { APPROVAL_TYPES } from "../db/schema";
import * as approvals from "../services/approvals";
import * as messages from "../services/messages";
import * as notifications from "../services/notifications";
import * as files from "../services/files";
import * as directory from "../services/directory";
import { ROLES } from "../db/schema";
import { headers } from "next/headers";

export const sendMessageAction = action(
  z.object({ conversationId: z.string(), body: z.string().trim().min(1).max(4000), replyToId: z.string().optional().or(z.literal("")) }),
  (input, user) => messages.sendMessage(user, input.conversationId, input.body, input.replyToId || null),
);

export const markConversationReadAction = action(z.object({ conversationId: z.string() }), (input, user) => messages.markConversationRead(user, input.conversationId));
export const typingAction = action(z.object({ conversationId: z.string() }), (input, user) => messages.typing(user, input.conversationId, user.name));

export const requestApprovalAction = action(
  z.object({ projectId: z.string(), type: z.enum(APPROVAL_TYPES), title: z.string().trim().min(3).max(160), description: optionalText(4000), milestoneId: z.string().optional().or(z.literal("")), requestId: z.string().optional().or(z.literal("")), versionLabel: optionalText(60), dueDate: dateInput.optional() }),
  (input, user) => approvals.requestApproval(user, { ...input, description: input.description || undefined, milestoneId: input.milestoneId || null, requestId: input.requestId || null, versionLabel: input.versionLabel || null }),
  { revalidate: ["/admin", "/portal"] },
);

export const decideApprovalAction = action(
  z.object({ id: z.string(), decision: z.enum(["approved", "changes_requested", "comment"]), comment: optionalText(4000) }),
  (input, user) => approvals.decideApproval(user, input.id, input.decision, input.comment || undefined),
  { revalidate: ["/admin", "/portal"] },
);

export const markNotificationReadAction = action(z.object({ id: z.string() }), async (input, user) => { notifications.markRead(user.id, input.id); }, { revalidate: ["/admin", "/portal"] });
export const markAllNotificationsReadAction = action(z.object({}), async (_i, user) => { notifications.markAllRead(user.id); }, { revalidate: ["/admin", "/portal"] });

const prefShape = z.object({ inApp: z.boolean(), email: z.boolean(), browser: z.boolean() });
export const savePreferencesAction = action(
  z.object({ prefs: z.record(z.string(), prefShape), browserOptIn: z.boolean() }),
  async (input, user) => { notifications.savePrefs(user.id, input.prefs as notifications.Prefs, input.browserOptIn); },
  { revalidate: ["/admin", "/portal"] },
);

export const deleteFileAction = action(z.object({ id: z.string() }), (input, user) => files.deleteFile(user, input.id), { revalidate: ["/admin", "/portal"] });

export const updateProfileAction = action(
  z.object({ name: z.string().trim().min(2).max(80), title: optionalText(80), timezone: optionalText(60) }),
  async (input, user) => { directory.updateProfile(user, { name: input.name, title: input.title || null, timezone: input.timezone || null }); },
  { revalidate: ["/admin", "/portal"] },
);

export const createClientAction = action(
  z.object({ name: z.string().trim().min(2).max(120), website: optionalText(200), industry: optionalText(80), notes: optionalText(2000) }),
  async (input, user) => directory.createClient(user, { name: input.name, website: input.website || undefined, industry: input.industry || undefined, notes: input.notes || undefined }),
  { revalidate: ["/admin"] },
);

export const updateClientAction = action(
  z.object({ id: z.string(), name: z.string().trim().min(2).max(120).optional(), website: optionalText(200), industry: optionalText(80), notes: optionalText(2000) }),
  async (input, user) => { const { id, ...patch } = input; directory.updateClient(user, id, { ...patch, website: patch.website === "" ? null : patch.website, industry: patch.industry === "" ? null : patch.industry, notes: patch.notes === "" ? null : patch.notes }); },
  { revalidate: ["/admin"] },
);

export const inviteUserAction = action(
  z.object({ name: z.string().trim().min(2).max(80), email: z.email("Enter a valid email."), role: z.enum(ROLES), organisationId: z.string().optional().or(z.literal("")), title: optionalText(80) }),
  async (input, user) => { const h = await headers(); return directory.inviteUser(user, { ...input, organisationId: input.organisationId || null, title: input.title || undefined }, h.get("x-forwarded-for")); },
  { revalidate: ["/admin", "/portal"] },
);

export const updateUserAction = action(
  z.object({ id: z.string(), role: z.enum(ROLES).optional(), disabled: z.boolean().optional(), title: optionalText(80) }),
  async (input, user) => { const h = await headers(); const { id, ...patch } = input; directory.updateUser(user, id, { ...patch, title: patch.title === "" ? null : patch.title }, h.get("x-forwarded-for")); },
  { revalidate: ["/admin", "/portal"] },
);
