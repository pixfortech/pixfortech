/**
 * Relational schema for the Pixel Forge platform (Drizzle ORM, SQLite dialect).
 *
 * Tenancy: every client-scoped row carries `organisationId`; staff rows use
 * the Pixel Forge organisation. All access goes through src/server/services
 * which enforce tenant isolation server-side.
 *
 * The same structure ports to PostgreSQL by swapping the column builders
 * (drizzle-orm/pg-core) and the driver; names, keys and indexes are identical.
 */
import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const now = () => integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch('subsec') * 1000)`);
const updated = () => integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch('subsec') * 1000)`);
const ts = (name: string) => integer(name, { mode: "timestamp_ms" });

export const ROLES = ["super_admin", "admin", "project_manager", "team_member", "client_admin", "client_member"] as const;
export type Role = (typeof ROLES)[number];
export const STAFF_ROLES: Role[] = ["super_admin", "admin", "project_manager", "team_member"];
export const CLIENT_ROLES: Role[] = ["client_admin", "client_member"];

// ---------------------------------------------------------------- organisations
export const organisations = sqliteTable("organisations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  /** "studio" for Pixel Forge itself, "client" for customers */
  kind: text("kind", { enum: ["studio", "client"] }).notNull().default("client"),
  website: text("website"),
  industry: text("industry"),
  /** JSON PixelTheme for subtle project identity */
  pixelTheme: text("pixel_theme"),
  notes: text("notes"),
  createdAt: now(),
  updatedAt: updated(),
  deletedAt: ts("deleted_at"),
}, (t) => [uniqueIndex("org_slug_idx").on(t.slug)]);

// ---------------------------------------------------------------- auth (better-auth core tables)
export const users = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  role: text("role", { enum: ROLES }).notNull().default("client_member"),
  organisationId: text("organisation_id").references(() => organisations.id),
  title: text("title"),
  timezone: text("timezone"),
  disabled: integer("disabled", { mode: "boolean" }).notNull().default(false),
  createdAt: now(),
  updatedAt: updated(),
}, (t) => [uniqueIndex("user_email_idx").on(t.email), index("user_org_idx").on(t.organisationId)]);

export const sessions = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  token: text("token").notNull(),
  createdAt: now(),
  updatedAt: updated(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
}, (t) => [uniqueIndex("session_token_idx").on(t.token), index("session_user_idx").on(t.userId)]);

export const accounts = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: ts("access_token_expires_at"),
  refreshTokenExpiresAt: ts("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: now(),
  updatedAt: updated(),
}, (t) => [index("account_user_idx").on(t.userId)]);

export const verifications = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: now(),
  updatedAt: updated(),
}, (t) => [index("verification_identifier_idx").on(t.identifier)]);

// ---------------------------------------------------------------- projects
export const PROJECT_STATUSES = [
  "lead", "discovery", "planning", "design", "development", "internal_qa", "client_review",
  "changes_requested", "final_qa", "deployment", "maintenance", "completed", "on_hold",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export const HEALTH = ["on_track", "at_risk", "delayed"] as const;

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  organisationId: text("organisation_id").notNull().references(() => organisations.id),
  code: text("code").notNull(), // PF-0042
  title: text("title").notNull(),
  summary: text("summary"),
  status: text("status").notNull().default("planning"),
  priority: text("priority", { enum: PRIORITIES }).notNull().default("medium"),
  health: text("health", { enum: HEALTH }).notNull().default("on_track"),
  progress: integer("progress").notNull().default(0), // 0..100
  phase: text("phase"),
  managerId: text("manager_id").references(() => users.id),
  startDate: ts("start_date"),
  targetDate: ts("target_date"),
  /** JSON PixelTheme */
  pixelTheme: text("pixel_theme"),
  /** JSON array of custom workflow states, overrides PROJECT_STATUSES when set */
  workflow: text("workflow"),
  createdById: text("created_by_id").references(() => users.id),
  createdAt: now(),
  updatedAt: updated(),
  deletedAt: ts("deleted_at"),
}, (t) => [uniqueIndex("project_code_idx").on(t.code), index("project_org_idx").on(t.organisationId), index("project_status_idx").on(t.status), index("project_manager_idx").on(t.managerId)]);

export const projectMembers = sqliteTable("project_members", {
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["manager", "member", "client"] }).notNull().default("member"),
  createdAt: now(),
}, (t) => [primaryKey({ columns: [t.projectId, t.userId] }), index("pm_user_idx").on(t.userId)]);

export const MILESTONE_STATUSES = ["planned", "in_progress", "awaiting_approval", "completed", "blocked"] as const;
export const milestones = sqliteTable("milestones", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: MILESTONE_STATUSES }).notNull().default("planned"),
  progress: integer("progress").notNull().default(0),
  ownerId: text("owner_id").references(() => users.id),
  startDate: ts("start_date"),
  dueDate: ts("due_date"),
  order: integer("sort_order").notNull().default(0),
  dependsOnId: text("depends_on_id"),
  clientVisible: integer("client_visible", { mode: "boolean" }).notNull().default(true),
  requiresApproval: integer("requires_approval", { mode: "boolean" }).notNull().default(false),
  createdAt: now(),
  updatedAt: updated(),
}, (t) => [index("milestone_project_idx").on(t.projectId)]);

export const TASK_STATUSES = ["backlog", "todo", "in_progress", "in_review", "blocked", "done"] as const;
export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  milestoneId: text("milestone_id").references(() => milestones.id, { onDelete: "set null" }),
  requestId: text("request_id"),
  key: text("key").notNull(), // PF-0042-17
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: TASK_STATUSES }).notNull().default("todo"),
  priority: text("priority", { enum: PRIORITIES }).notNull().default("medium"),
  assigneeId: text("assignee_id").references(() => users.id),
  dueDate: ts("due_date"),
  labels: text("labels"), // JSON string[]
  checklist: text("checklist"), // JSON {text, done}[]
  clientVisible: integer("client_visible", { mode: "boolean" }).notNull().default(false),
  order: integer("sort_order").notNull().default(0),
  createdById: text("created_by_id").references(() => users.id),
  completedAt: ts("completed_at"),
  createdAt: now(),
  updatedAt: updated(),
}, (t) => [uniqueIndex("task_key_idx").on(t.key), index("task_project_idx").on(t.projectId), index("task_assignee_idx").on(t.assigneeId), index("task_status_idx").on(t.status), index("task_due_idx").on(t.dueDate)]);

export const taskCollaborators = sqliteTable("task_collaborators", {
  taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.taskId, t.userId] })]);

export const taskComments = sqliteTable("task_comments", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull().references(() => users.id),
  body: text("body").notNull(),
  internal: integer("internal", { mode: "boolean" }).notNull().default(true),
  createdAt: now(),
}, (t) => [index("task_comment_task_idx").on(t.taskId)]);

// ---------------------------------------------------------------- requests
export const REQUEST_TYPES = ["edit", "bug", "feature", "design", "content", "integration", "performance", "other"] as const;
export const REQUEST_STATUSES = [
  "submitted", "acknowledged", "under_review", "needs_clarification", "estimated", "approved", "scheduled",
  "in_progress", "ready_for_review", "changes_requested", "completed", "closed", "rejected", "cancelled",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const requests = sqliteTable("requests", {
  id: text("id").primaryKey(),
  organisationId: text("organisation_id").notNull().references(() => organisations.id),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  number: integer("number").notNull(), // PF-REQ-0142
  title: text("title").notNull(),
  type: text("type", { enum: REQUEST_TYPES }).notNull().default("edit"),
  description: text("description").notNull(),
  area: text("area"),
  priority: text("priority", { enum: PRIORITIES }).notNull().default("medium"),
  reason: text("reason"),
  desiredDate: ts("desired_date"),
  status: text("status", { enum: REQUEST_STATUSES }).notNull().default("submitted"),
  requesterId: text("requester_id").notNull().references(() => users.id),
  assigneeId: text("assignee_id").references(() => users.id),
  estimate: text("estimate"),
  estimatedCompletion: ts("estimated_completion"),
  createdAt: now(),
  updatedAt: updated(),
  closedAt: ts("closed_at"),
}, (t) => [uniqueIndex("request_number_idx").on(t.number), index("request_project_idx").on(t.projectId), index("request_org_idx").on(t.organisationId), index("request_status_idx").on(t.status), index("request_assignee_idx").on(t.assigneeId)]);

export const requestComments = sqliteTable("request_comments", {
  id: text("id").primaryKey(),
  requestId: text("request_id").notNull().references(() => requests.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull().references(() => users.id),
  body: text("body").notNull(),
  /** Internal notes are never returned to client sessions. Enforced in services. */
  internal: integer("internal", { mode: "boolean" }).notNull().default(false),
  createdAt: now(),
}, (t) => [index("request_comment_request_idx").on(t.requestId)]);

// ---------------------------------------------------------------- files
export const files = sqliteTable("files", {
  id: text("id").primaryKey(),
  organisationId: text("organisation_id").notNull().references(() => organisations.id),
  projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
  taskId: text("task_id").references(() => tasks.id, { onDelete: "set null" }),
  requestId: text("request_id").references(() => requests.id, { onDelete: "set null" }),
  messageId: text("message_id"),
  approvalId: text("approval_id"),
  name: text("name").notNull(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  /** Storage driver key, never the original filename. */
  storageKey: text("storage_key").notNull(),
  driver: text("driver", { enum: ["local", "s3"] }).notNull().default("local"),
  version: integer("version").notNull().default(1),
  supersedesId: text("supersedes_id"),
  uploaderId: text("uploader_id").notNull().references(() => users.id),
  clientVisible: integer("client_visible", { mode: "boolean" }).notNull().default(true),
  scanStatus: text("scan_status", { enum: ["pending", "clean", "flagged", "skipped"] }).notNull().default("skipped"),
  createdAt: now(),
  deletedAt: ts("deleted_at"),
}, (t) => [index("file_project_idx").on(t.projectId), index("file_request_idx").on(t.requestId), index("file_task_idx").on(t.taskId), index("file_org_idx").on(t.organisationId)]);

// ---------------------------------------------------------------- conversations & messages
export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  organisationId: text("organisation_id").notNull().references(() => organisations.id),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  /** null = project channel; set = request thread */
  requestId: text("request_id").references(() => requests.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  /** Internal conversations are staff-only. */
  internal: integer("internal", { mode: "boolean" }).notNull().default(false),
  createdAt: now(),
  lastMessageAt: ts("last_message_at"),
}, (t) => [index("conversation_project_idx").on(t.projectId), index("conversation_request_idx").on(t.requestId)]);

export const conversationMembers = sqliteTable("conversation_members", {
  conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lastReadAt: ts("last_read_at"),
}, (t) => [primaryKey({ columns: [t.conversationId, t.userId] })]);

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull().references(() => users.id),
  body: text("body").notNull(),
  replyToId: text("reply_to_id"),
  /** JSON string[] of mentioned user ids */
  mentions: text("mentions"),
  editedAt: ts("edited_at"),
  createdAt: now(),
  deletedAt: ts("deleted_at"),
}, (t) => [index("message_conversation_idx").on(t.conversationId), index("message_created_idx").on(t.createdAt)]);

// ---------------------------------------------------------------- approvals
export const APPROVAL_TYPES = ["design", "milestone", "request", "content", "staging", "delivery"] as const;
export const approvals = sqliteTable("approvals", {
  id: text("id").primaryKey(),
  organisationId: text("organisation_id").notNull().references(() => organisations.id),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  type: text("type", { enum: APPROVAL_TYPES }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  milestoneId: text("milestone_id").references(() => milestones.id, { onDelete: "set null" }),
  requestId: text("request_id").references(() => requests.id, { onDelete: "set null" }),
  versionLabel: text("version_label"),
  status: text("status", { enum: ["pending", "approved", "changes_requested", "withdrawn"] }).notNull().default("pending"),
  requestedById: text("requested_by_id").notNull().references(() => users.id),
  dueDate: ts("due_date"),
  createdAt: now(),
  decidedAt: ts("decided_at"),
}, (t) => [index("approval_project_idx").on(t.projectId), index("approval_status_idx").on(t.status)]);

export const approvalDecisions = sqliteTable("approval_decisions", {
  id: text("id").primaryKey(),
  approvalId: text("approval_id").notNull().references(() => approvals.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id),
  decision: text("decision", { enum: ["approved", "changes_requested", "comment"] }).notNull(),
  comment: text("comment"),
  versionLabel: text("version_label"),
  createdAt: now(),
}, (t) => [index("decision_approval_idx").on(t.approvalId)]);

// ---------------------------------------------------------------- notifications
export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  category: text("category").notNull(), // message | request | task | approval | project | mention | file | milestone
  title: text("title").notNull(),
  body: text("body"),
  href: text("href"),
  projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
  actorId: text("actor_id").references(() => users.id),
  readAt: ts("read_at"),
  createdAt: now(),
}, (t) => [index("notification_user_idx").on(t.userId, t.readAt), index("notification_created_idx").on(t.createdAt)]);

export const notificationPreferences = sqliteTable("notification_preferences", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  /** JSON: { [category]: { inApp: boolean, email: boolean, browser: boolean } } */
  settings: text("settings").notNull(),
  browserOptIn: integer("browser_opt_in", { mode: "boolean" }).notNull().default(false),
  updatedAt: updated(),
});

// ---------------------------------------------------------------- activity & audit
export const activityEvents = sqliteTable("activity_events", {
  id: text("id").primaryKey(),
  organisationId: text("organisation_id").notNull().references(() => organisations.id),
  projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
  actorId: text("actor_id").references(() => users.id),
  kind: text("kind").notNull(),
  summary: text("summary").notNull(),
  targetType: text("target_type"),
  targetId: text("target_id"),
  href: text("href"),
  /** Staff-only events never reach client feeds. */
  internal: integer("internal", { mode: "boolean" }).notNull().default(false),
  createdAt: now(),
}, (t) => [index("activity_project_idx").on(t.projectId, t.createdAt), index("activity_org_idx").on(t.organisationId)]);

export const auditEvents = sqliteTable("audit_events", {
  id: text("id").primaryKey(),
  actorId: text("actor_id").references(() => users.id),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id"),
  metadata: text("metadata"),
  ip: text("ip"),
  createdAt: now(),
}, (t) => [index("audit_created_idx").on(t.createdAt), index("audit_actor_idx").on(t.actorId)]);

/** Monotonic counters for human-readable identifiers. */
export const counters = sqliteTable("counters", {
  name: text("name").primaryKey(),
  value: integer("value").notNull().default(0),
});

export type User = typeof users.$inferSelect;
export type Organisation = typeof organisations.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Milestone = typeof milestones.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type RequestRow = typeof requests.$inferSelect;
export type FileRow = typeof files.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Approval = typeof approvals.$inferSelect;
