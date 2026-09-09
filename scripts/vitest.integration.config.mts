import { defineConfig, mergeConfig } from "vitest/config";
import base from "../vitest.config.mjs";

export default mergeConfig(base, defineConfig({
  test: { include: ["scripts/file-metadata-qa.test.ts", "scripts/*.integration.test.ts"], testTimeout: 120000, fileParallelism: false },
}));
