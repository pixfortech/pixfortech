"use server";

import { z } from "zod";
import { action, dateInput, optionalText } from "./shared";
import { PRIORITIES, REQUEST_STATUSES, REQUEST_TYPES } from "../db/schema";
import * as requests from "../services/requests";

export const createRequestAction = action(
  z.object({ projectId: z.string().min(1, "Choose a project."), title: z.string().trim().min(4, "Give the request a clear title.").max(160), type: z.enum(REQUEST_TYPES), description: z.string().trim().min(12, "Describe what you need in a sentence or two.").max(8000), area: optionalText(200), priority: z.enum(PRIORITIES).optional(), reason: optionalText(2000), desiredDate: dateInput.optional() }),
  (input, user) => requests.createRequest(user, { ...input, area: input.area || undefined, reason: input.reason || undefined }),
  { revalidate: ["/admin", "/portal"] },
);

export const transitionRequestAction = action(
  z.object({ id: z.string(), status: z.enum(REQUEST_STATUSES), note: optionalText(500) }),
  (input, user) => requests.transitionRequest(user, input.id, input.status, input.note || undefined),
  { revalidate: ["/admin", "/portal"] },
);

export const assignRequestAction = action(
  z.object({ id: z.string(), assigneeId: z.string().optional().or(z.literal("")), estimate: optionalText(200), estimatedCompletion: dateInput.optional() }),
  (input, user) => requests.assignRequest(user, input.id, input.assigneeId || null, input.estimate === undefined ? undefined : input.estimate || null, input.estimatedCompletion),
  { revalidate: ["/admin", "/portal"] },
);

export const addRequestCommentAction = action(
  z.object({ id: z.string(), body: z.string().trim().min(1, "Write something first.").max(4000), internal: z.coerce.boolean().optional() }),
  (input, user) => requests.addRequestComment(user, input.id, input.body, input.internal ?? false),
  { revalidate: ["/admin", "/portal"] },
);
