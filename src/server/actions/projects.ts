"use server";

import { z } from "zod";
import { action, dateInput, optionalText } from "./shared";
import { HEALTH, MILESTONE_STATUSES, PRIORITIES } from "../db/schema";
import * as projects from "../services/projects";

export const createProjectAction = action(
  z.object({ organisationId: z.string().min(1, "Choose a client."), title: z.string().trim().min(3, "Give the project a title."), summary: optionalText(), status: z.string().optional(), priority: z.enum(PRIORITIES).optional(), managerId: z.string().optional().or(z.literal("")), startDate: dateInput.optional(), targetDate: dateInput.optional(), phase: optionalText(80) }),
  (input, user) => projects.createProject(user, { ...input, summary: input.summary || undefined, managerId: input.managerId || null, phase: input.phase || null }),
  { revalidate: ["/admin", "/portal"] },
);

export const updateProjectAction = action(
  z.object({ id: z.string(), title: z.string().trim().min(3).optional(), summary: optionalText(), status: z.string().optional(), priority: z.enum(PRIORITIES).optional(), health: z.enum(HEALTH).optional(), progress: z.coerce.number().min(0).max(100).optional(), managerId: z.string().optional().or(z.literal("")), startDate: dateInput.optional(), targetDate: dateInput.optional(), phase: optionalText(80), workflow: z.array(z.string().min(1).max(40)).max(30).nullable().optional() }),
  async (input, user) => { const { id, ...patch } = input; await projects.updateProject(user, id, { ...patch, summary: patch.summary === "" ? null : patch.summary, managerId: patch.managerId === "" ? null : patch.managerId, phase: patch.phase === "" ? null : patch.phase }); },
  { revalidate: ["/admin", "/portal"] },
);

export const setProjectMembersAction = action(
  z.object({ projectId: z.string(), members: z.array(z.object({ userId: z.string(), role: z.enum(["manager", "member", "client"]) })) }),
  (input, user) => projects.setProjectMembers(user, input.projectId, input.members),
  { revalidate: ["/admin", "/portal"] },
);

export const createMilestoneAction = action(
  z.object({ projectId: z.string(), title: z.string().trim().min(2, "Give the milestone a title."), description: optionalText(), status: z.enum(MILESTONE_STATUSES).optional(), ownerId: z.string().optional().or(z.literal("")), startDate: dateInput.optional(), dueDate: dateInput.optional(), clientVisible: z.coerce.boolean().optional(), requiresApproval: z.coerce.boolean().optional(), dependsOnId: z.string().optional().or(z.literal("")) }),
  (input, user) => projects.createMilestone(user, input.projectId, { ...input, description: input.description || undefined, ownerId: input.ownerId || null, dependsOnId: input.dependsOnId || null }),
  { revalidate: ["/admin", "/portal"] },
);

export const updateMilestoneAction = action(
  z.object({ id: z.string(), title: z.string().trim().min(2).optional(), description: optionalText(), status: z.enum(MILESTONE_STATUSES).optional(), progress: z.coerce.number().min(0).max(100).optional(), ownerId: z.string().optional().or(z.literal("")), startDate: dateInput.optional(), dueDate: dateInput.optional(), clientVisible: z.coerce.boolean().optional(), requiresApproval: z.coerce.boolean().optional() }),
  async (input, user) => { const { id, ...patch } = input; await projects.updateMilestone(user, id, { ...patch, description: patch.description === "" ? undefined : patch.description, ownerId: patch.ownerId === "" ? null : patch.ownerId }); },
  { revalidate: ["/admin", "/portal"] },
);
