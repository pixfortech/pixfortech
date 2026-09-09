import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

if (existsSync(".env.qa")) process.loadEnvFile(".env.qa");
export const launchBrowser = () => chromium.launch({ ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
export function qaOutput(suite) {
  const dir = path.resolve(process.env.QA_OUTPUT_DIR ?? "artifacts/qa", suite);
  mkdirSync(dir, { recursive: true });
  return dir;
}
export function qaPassword() {
  if (!process.env.QA_PASSWORD) throw new Error("Set QA_PASSWORD for isolated QA fixtures.");
  return process.env.QA_PASSWORD;
}
