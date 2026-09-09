/**
 * Relational schema for the Pixel Forge platform (Drizzle ORM, PostgreSQL dialect).
 *
 * Tenancy: every client-scoped row carries `organisationId`; staff rows use
 * the Pixel Forge organisation. All access goes through src/server/services
 * which enforce tenant isolation server-side.
 *
 * Original table names, keys and relationships are preserved from SQLite.
 */
import { bigint, boolean, index, integer, jsonb, primaryKey, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const now = () => timestamp("created_at", { withTimezone: true, mode: "date", precision: 3 }).notNull().defaultNow();
const updated = () => timestamp("updated_at", { withTimezone: true, mode: "date", precision: 3 }).notNull().defaultNow();
const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date", precision: 3 });

export const ROLES = ["super_admin", "admin", "project_manager", "team_member", "client_admin", "client_member"] as const;
export type Role = (typeof ROLES)[number];
export const STAFF_ROLES: Role[] = ["super_admin", "admin", "project_manager", "team_member"];
export const CLIENT_ROLES: Role[] = ["client_admin", "client_member"];

// ---------------------------------------------------------------- organisations
export const organisations = pgTable("organisations", {
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
export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role", { enum: ROLES }).notNull().default("client_member"),
  organisationId: text("organisation_id").references(() => organisations.id),
  title: text("title"),
  timezone: text("timezone"),
  disabled: boolean("disabled").notNull().default(false),
  /** Professional profile. Authorisation never derives from any of these; the immutable id is the identity. */
  username: text("username"),
  /** Public, SEO-friendly address under /people/. Present only once chosen; published only when publicProfile is true. */
  publicSlug: text("public_slug"),
  publicProfile: boolean("public_profile").notNull().default(false),
  displayName: text("display_name"),
  bio: text("bio"),
  linkedinUrl: text("linkedin_url"),
  githubUrl: text("github_url"),
  websiteUrl: text("website_url"),
  /** Avatar stored through the private storage driver; served via /api/avatar/[id]. */
  avatarKey: text("avatar_key"),
  avatarMime: text("avatar_mime"),
  /** Set by the owner bootstrap: the next successful sign-in must change the password. */
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  /** Lightweight PiP/game experience state mirrored from the browser so returning users never hear a repeat. */
  experience: jsonb("experience").$type<Record<string, unknown>>(),
  createdAt: now(),
  updatedAt: updated(),
}, (t) => [uniqueIndex("user_email_idx").on(t.email), index("user_org_idx").on(t.organisationId), uniqueIndex("user_username_idx").on(t.username), uniqueIndex("user_public_slug_idx").on(t.publicSlug)]);

/** Every public slug a user has ever held, so old profile links redirect permanently. */
export const profileSlugHistory = pgTable("profile_slug_history", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  replacedBy: text("replaced_by").notNull(),
  createdAt: now(),
}, (t) => [uniqueIndex("profile_slug_history_slug_idx").on(t.slug), index("profile_slug_history_user_idx").on(t.userId)]);

export const sessions = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date", precision: 3 }).notNull(),
  token: text("token").notNull(),
  createdAt: now(),
  updatedAt: updated(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
}, (t) => [uniqueIndex("session_token_idx").on(t.token), index("session_user_idx").on(t.userId)]);

export const accounts = pgTable("account", {
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

export const verifications = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date", precision: 3 }).notNull(),
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

export const projects = pgTable("projects", {
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

export const projectMembers = pgTable("project_members", {
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["manager", "member", "client"] }).notNull().default("member"),
  createdAt: now(),
}, (t) => [primaryKey({ columns: [t.projectId, t.userId] }), index("pm_user_idx").on(t.userId)]);

export const MILESTONE_STATUSES = ["planned", "in_progress", "awaiting_approval", "completed", "blocked"] as const;
export const milestones = pgTable("milestones", {
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
  clientVisible: boolean("client_visible").notNull().default(true),
  requiresApproval: boolean("requires_approval").notNull().default(false),
  createdAt: now(),
  updatedAt: updated(),
}, (t) => [index("milestone_project_idx").on(t.projectId)]);

export const TASK_STATUSES = ["backlog", "todo", "in_progress", "in_review", "blocked", "done"] as const;
export const tasks = pgTable("tasks", {
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
  clientVisible: boolean("client_visible").notNull().default(false),
  order: integer("sort_order").notNull().default(0),
  createdById: text("created_by_id").references(() => users.id),
  completedAt: ts("completed_at"),
  createdAt: now(),
  updatedAt: updated(),
}, (t) => [uniqueIndex("task_key_idx").on(t.key), index("task_project_idx").on(t.projectId), index("task_assignee_idx").on(t.assigneeId), index("task_status_idx").on(t.status), index("task_due_idx").on(t.dueDate)]);

export const taskCollaborators = pgTable("task_collaborators", {
  taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.taskId, t.userId] })]);

export const taskComments = pgTable("task_comments", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull().references(() => users.id),
  body: text("body").notNull(),
  internal: boolean("internal").notNull().default(true),
  createdAt: now(),
}, (t) => [index("task_comment_task_idx").on(t.taskId)]);

// ---------------------------------------------------------------- requests
export const REQUEST_TYPES = ["edit", "bug", "feature", "design", "content", "integration", "performance", "other"] as const;
export const REQUEST_STATUSES = [
  "submitted", "acknowledged", "under_review", "needs_clarification", "estimated", "approved", "scheduled",
  "in_progress", "ready_for_review", "changes_requested", "completed", "closed", "rejected", "cancelled",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const requests = pgTable("requests", {
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

export const requestComments = pgTable("request_comments", {
  id: text("id").primaryKey(),
  requestId: text("request_id").notNull().references(() => requests.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull().references(() => users.id),
  body: text("body").notNull(),
  /** Internal notes are never returned to client sessions. Enforced in services. */
  internal: boolean("internal").notNull().default(false),
  createdAt: now(),
}, (t) => [index("request_comment_request_idx").on(t.requestId)]);

// ---------------------------------------------------------------- files
export const files = pgTable("files", {
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
  clientVisible: boolean("client_visible").notNull().default(true),
  scanStatus: text("scan_status", { enum: ["pending", "clean", "flagged", "skipped"] }).notNull().default("skipped"),
  createdAt: now(),
  deletedAt: ts("deleted_at"),
}, (t) => [index("file_project_idx").on(t.projectId), index("file_request_idx").on(t.requestId), index("file_task_idx").on(t.taskId), index("file_org_idx").on(t.organisationId)]);

// ---------------------------------------------------------------- conversations & messages
export const conversations = pgTable("conversations", {
  id: text("id").primaryKey(),
  organisationId: text("organisation_id").notNull().references(() => organisations.id),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  /** null = project channel; set = request thread */
  requestId: text("request_id").references(() => requests.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  /** Internal conversations are staff-only. */
  internal: boolean("internal").notNull().default(false),
  createdAt: now(),
  lastMessageAt: ts("last_message_at"),
}, (t) => [index("conversation_project_idx").on(t.projectId), index("conversation_request_idx").on(t.requestId)]);

export const conversationMembers = pgTable("conversation_members", {
  conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lastReadAt: ts("last_read_at"),
}, (t) => [primaryKey({ columns: [t.conversationId, t.userId] })]);

export const messages = pgTable("messages", {
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
export const approvals = pgTable("approvals", {
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

export const approvalDecisions = pgTable("approval_decisions", {
  id: text("id").primaryKey(),
  approvalId: text("approval_id").notNull().references(() => approvals.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id),
  decision: text("decision", { enum: ["approved", "changes_requested", "comment"] }).notNull(),
  comment: text("comment"),
  versionLabel: text("version_label"),
  createdAt: now(),
}, (t) => [index("decision_approval_idx").on(t.approvalId)]);

// ---------------------------------------------------------------- notifications
export const notifications = pgTable("notifications", {
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

export const notificationPreferences = pgTable("notification_preferences", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  /** JSON: { [category]: { inApp: boolean, email: boolean, browser: boolean } } */
  settings: text("settings").notNull(),
  browserOptIn: boolean("browser_opt_in").notNull().default(false),
  updatedAt: updated(),
});

// ---------------------------------------------------------------- activity & audit
export const activityEvents = pgTable("activity_events", {
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
  internal: boolean("internal").notNull().default(false),
  createdAt: now(),
}, (t) => [index("activity_project_idx").on(t.projectId, t.createdAt), index("activity_org_idx").on(t.organisationId)]);

export const auditEvents = pgTable("audit_events", {
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
export const counters = pgTable("counters", {
  name: text("name").primaryKey(),
  value: integer("value").notNull().default(0),
});

/** Durable event log shared by all serverless instances; retained for 24 hours. */
export const realtimeEvents = pgTable("realtime_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  audience: jsonb("audience").$type<{ userIds?: string[]; projectIds?: string[]; organisationIds?: string[]; staff?: boolean }>().notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  createdAt: now(),
}, (t) => [index("realtime_created_idx").on(t.createdAt)]);

export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

export const uploadSessions = pgTable("upload_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  target: jsonb("target").$type<{ projectId: string; taskId?: string; requestId?: string; messageId?: string; clientVisible?: boolean }>().notNull(),
  name: text("name").notNull(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  status: text("status", { enum: ["pending", "validating", "complete", "failed"] }).notNull().default("pending"),
  createdAt: now(),
  expiresAt: ts("expires_at").notNull(),
}, (t) => [index("upload_session_expiry_idx").on(t.expiresAt)]);

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
