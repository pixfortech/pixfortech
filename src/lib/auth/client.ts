"use client";

import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";

/** Browser client for better-auth: sign in/up/out, password reset, magic links. */
export const authClient = createAuthClient({ plugins: [magicLinkClient()] });
