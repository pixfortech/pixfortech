import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Development only: lets QA open the dev server from a second local origin (and any
  // extra hosts in QA_DEV_ORIGINS) to prove sessions and verification across origins.
  allowedDevOrigins: ["127.0.0.1", ...(process.env.QA_DEV_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean) ?? [])],
  outputFileTracingExcludes: {
    "/*": ["./data/**/*", "./storage/**/*", "./.env*", "./artifacts/**/*"],
  },
};

export default nextConfig;
