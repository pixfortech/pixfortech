import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    "/*": ["./data/**/*", "./storage/**/*", "./.env*", "./artifacts/**/*"],
  },
};

export default nextConfig;
