import "server-only";
import { eq, sql } from "drizzle-orm";
import { files } from "../db/schema";

/** Apply alongside project authorization to every client-facing attachment query. */
export function clientFileConditions() {
  return [
    eq(files.clientVisible, true),
    sql`(${files.taskId} is null or exists (select 1 from tasks t where t.id = ${files.taskId} and t.project_id = ${files.projectId} and t.client_visible = true))`,
    sql`(${files.messageId} is null or exists (select 1 from messages m join conversations c on c.id = m.conversation_id where m.id = ${files.messageId} and c.project_id = ${files.projectId} and c.internal = false))`,
  ];
}
