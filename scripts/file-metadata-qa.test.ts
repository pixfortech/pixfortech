// Run only against the isolated QA database; fixtures created here are removed in finally.
import assert from "node:assert/strict";
import { test } from "vitest";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { eq } from "drizzle-orm";
import { db, schema } from "../src/server/db";
import { search } from "../src/server/services/directory";
import { fileFor, listFiles } from "../src/server/services/files";
import { getTask } from "../src/server/services/tasks";
import { getRequest } from "../src/server/services/requests";
import { getApproval } from "../src/server/services/approvals";
import { listMessages } from "../src/server/services/messages";

async function main() {
  assert.equal(process.env.QA_DISPOSABLE_DATABASE, "true", "Explicit isolated QA database acknowledgement required");
  const production = parseEnv(readFileSync(".env.neon-production", "utf8"));
  assert.ok(production.DATABASE_URL, "Production host is required for the safety comparison");
  const host = (url: string) => new URL(url).hostname.replace("-pooler.", ".");
  assert.notEqual(host(process.env.DATABASE_URL!), host(production.DATABASE_URL), "Never run this suite against production");
  const [client] = await db.select().from(schema.users).where(eq(schema.users.email, "maya@northbank.test")).limit(1);
  const [staff] = await db.select().from(schema.users).where(eq(schema.users.email, "admin@pixelforge.test")).limit(1);
  assert.ok(client && staff, "Isolated QA actors must exist");
  const [project] = await db.select().from(schema.projects).where(eq(schema.projects.organisationId, client.organisationId!)).limit(1);
  const [request] = await db.select().from(schema.requests).where(eq(schema.requests.projectId, project.id)).limit(1);
  const [approval] = await db.select().from(schema.approvals).where(eq(schema.approvals.projectId, project.id)).limit(1);
  assert.ok(request && approval, "QA request and approval fixtures are required");
  const taskId = randomUUID(), conversationId = randomUUID(), messageId = randomUUID(), fileId = randomUUID();
  const marker = `metadata-${randomUUID()}`;
  const includesFile = (rows: { id: string }[]) => rows.some(row => row.id === fileId);
  try {
    await db.insert(schema.tasks).values({ id: taskId, projectId: project.id, key: marker, title: marker, clientVisible: true });
    await db.insert(schema.conversations).values({ id: conversationId, projectId: project.id, organisationId: project.organisationId, title: marker, internal: false });
    await db.insert(schema.messages).values({ id: messageId, conversationId, authorId: staff.id, body: marker });
    await db.insert(schema.files).values({ id: fileId, projectId: project.id, organisationId: project.organisationId, taskId, requestId: request.id, approvalId: approval.id, messageId, uploaderId: staff.id, name: marker + ".txt", mime: "text/plain", size: 1, storageKey: marker, driver: "s3", clientVisible: true });

    async function verify(expected: boolean, taskVisible = true, conversationVisible = true) {
      const [found, listed, requestView, approvalView, taskView, downloadable] = await Promise.all([
        search(client, marker), listFiles(client, { projectId: project.id }), getRequest(client, request.id),
        getApproval(client, approval.id), getTask(client, taskId), fileFor(client, fileId),
      ]);
      assert.equal(includesFile(found.files), expected, "Search must follow current attachment visibility");
      assert.equal(includesFile(listed), expected, "File list must follow current attachment visibility");
      assert.equal(includesFile(requestView!.files), expected, "Request attachments must follow current visibility");
      assert.equal(includesFile(approvalView!.files), expected, "Approval attachments must follow current visibility");
      assert.equal(Boolean(downloadable), expected, "Download authorization must agree with metadata visibility");
      if (taskVisible) assert.equal(includesFile(taskView!.files), expected, "Task attachments must follow current visibility");
      else assert.equal(taskView, null);
      if (conversationVisible) {
        const messages = await listMessages(client, conversationId);
        assert.equal(includesFile(messages.messages.flatMap(message => message.files)), expected, "Chat attachments must follow current visibility");
      } else await assert.rejects(listMessages(client, conversationId), /Conversation not found/);
    }
    await verify(true);
    await db.update(schema.files).set({ clientVisible: false }).where(eq(schema.files.id, fileId));
    await verify(false);
    assert.ok(includesFile((await search(staff, marker)).files), "Staff must retain access to private attachment metadata");
    await db.update(schema.files).set({ clientVisible: true }).where(eq(schema.files.id, fileId));
    await db.update(schema.tasks).set({ clientVisible: false }).where(eq(schema.tasks.id, taskId));
    await verify(false, false);
    await db.update(schema.tasks).set({ clientVisible: true }).where(eq(schema.tasks.id, taskId));
    await db.update(schema.conversations).set({ internal: true }).where(eq(schema.conversations.id, conversationId));
    await verify(false, true, false);
    await db.update(schema.conversations).set({ internal: false }).where(eq(schema.conversations.id, conversationId));
    await db.update(schema.files).set({ deletedAt: new Date() }).where(eq(schema.files.id, fileId));
    await verify(false);
    console.log("PASS: private, newly internal and removed file metadata is excluded from search, lists, request/task/approval/chat views; staff access is preserved");
  } finally {
    // Exact IDs created above; no pre-existing row or storage object is removed.
    await db.delete(schema.files).where(eq(schema.files.id, fileId));
    await db.delete(schema.messages).where(eq(schema.messages.id, messageId));
    await db.delete(schema.conversations).where(eq(schema.conversations.id, conversationId));
    await db.delete(schema.tasks).where(eq(schema.tasks.id, taskId));
  }
}
test("attachment metadata follows current visibility across every read surface", main, 120000);
