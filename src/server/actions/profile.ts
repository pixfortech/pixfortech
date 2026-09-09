"use server";

import { z } from "zod";
import { action, optionalText } from "./shared";
import * as profile from "../services/profile";

const optionalUrl = z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string().max(200).optional().or(z.literal("")));

export const updateProfileAction = action(
  z.object({
    userId: z.string().optional(),
    name: z.string().trim().min(2).max(80),
    displayName: optionalText(60),
    title: optionalText(80),
    timezone: optionalText(60),
    bio: optionalText(600),
    linkedinUrl: optionalUrl,
    githubUrl: optionalUrl,
    websiteUrl: optionalUrl,
  }),
  async (input, user) => {
    await profile.updateProfile(user, input.userId || user.id, {
      name: input.name, displayName: input.displayName ?? "", title: input.title ?? "", timezone: input.timezone ?? "", bio: input.bio ?? "",
      linkedinUrl: input.linkedinUrl ?? "", githubUrl: input.githubUrl ?? "", websiteUrl: input.websiteUrl ?? "",
    });
  },
  { revalidate: ["/admin", "/portal", "/people"] },
);

export const setUsernameAction = action(
  z.object({ userId: z.string().optional(), username: z.string().trim().max(40) }),
  (input, user) => profile.setUsername(user, input.userId || user.id, input.username),
  { revalidate: ["/admin", "/portal"] },
);

export const setPublicSlugAction = action(
  z.object({ userId: z.string().optional(), slug: z.string().trim().max(80) }),
  (input, user) => profile.setPublicSlug(user, input.userId || user.id, input.slug),
  { revalidate: ["/admin", "/portal", "/people"] },
);

export const setProfilePublishedAction = action(
  z.object({ userId: z.string().optional(), published: z.boolean() }),
  (input, user) => profile.setPublished(user, input.userId || user.id, input.published),
  { revalidate: ["/admin", "/portal", "/people"] },
);

/** Live validation for the editor. Read-only; returns format and availability. */
export const checkIdentityAction = action(
  z.object({ kind: z.enum(["username", "slug"]), value: z.string().max(80) }),
  (input, user) => (input.kind === "username" ? profile.checkUsername(user, input.value) : profile.checkSlug(user, input.value)),
);
