"use server";

import { z } from "zod";
import { action, dateInput, optionalText } from "./shared";
import { PRIORITIES, TASK_STATUSES } from "../db/schema";
import * as tasks from "../services/tasks";

const checklist = z.array(z.object({ text: z.string().max(200), done: z.boolean() })).max(50);

export const createTaskAction = action(
  z.object({ projectId: z.string(), title: z.string().trim().min(2, "Give the task a title."), description: optionalText(5000), status: z.enum(TASK_STATUSES).optional(), priority: z.enum(PRIORITIES).optional(), assigneeId: z.string().optional().or(z.literal("")), dueDate: dateInput.optional(), labels: z.array(z.string().max(30)).max(10).optional(), milestoneId: z.string().optional().or(z.literal("")), requestId: z.string().optional().or(z.literal("")), clientVisible: z.coerce.boolean().optional(), checklist: checklist.optional() }),
  (input, user) => tasks.createTask(user, input.projectId, { ...input, description: input.description || undefined, assigneeId: input.assigneeId || null, milestoneId: input.milestoneId || null, requestId: input.requestId || null }),
  { revalidate: ["/admin", "/portal"] },
);

export const updateTaskAction = action(
  z.object({ id: z.string(), title: z.string().trim().min(2).optional(), description: optionalText(5000), status: z.enum(TASK_STATUSES).optional(), priority: z.enum(PRIORITIES).optional(), assigneeId: z.string().optional().or(z.literal("")), dueDate: dateInput.optional(), labels: z.array(z.string().max(30)).max(10).optional(), milestoneId: z.string().optional().or(z.literal("")), requestId: z.string().optional().or(z.literal("")), clientVisible: z.coerce.boolean().optional(), checklist: checklist.optional() }),
  async (input, user) => { const { id, ...patch } = input; await tasks.updateTask(user, id, { ...patch, description: patch.description === "" ? undefined : patch.description, assigneeId: patch.assigneeId === "" ? null : patch.assigneeId, milestoneId: patch.milestoneId === "" ? null : patch.milestoneId, requestId: patch.requestId === "" ? null : patch.requestId }); },
  { revalidate: ["/admin", "/portal"] },
);

export const moveTaskAction = action(
  z.object({ id: z.string(), status: z.enum(TASK_STATUSES) }),
  (input, user) => tasks.updateTask(user, input.id, { status: input.status }),
  { revalidate: ["/admin"] },
);

export const addTaskCommentAction = action(
  z.object({ taskId: z.string(), body: z.string().trim().min(1, "Write something first.").max(4000), internal: z.coerce.boolean().optional() }),
  (input, user) => tasks.addTaskComment(user, input.taskId, input.body, input.internal ?? true),
  { revalidate: ["/admin", "/portal"] },
);
