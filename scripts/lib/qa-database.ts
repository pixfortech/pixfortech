import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";

/** Remote integration tests may touch only the explicitly cloned, disposable QA endpoint. */
export function requireIsolatedQaDatabase() {
  const url = process.env.DATABASE_URL ?? "";
  const host = (value: string) => new URL(value).hostname.replace("-pooler.", ".");
  if (["localhost", "127.0.0.1", "::1"].includes(host(url))) return;
  assert.equal(process.env.QA_DISPOSABLE_DATABASE, "true", "Explicit disposable QA acknowledgement required");
  const qa = parseEnv(readFileSync(".env.experience-qa", "utf8"));
  const production = parseEnv(readFileSync(".env.neon-production", "utf8"));
  assert.ok(qa.DATABASE_URL && production.DATABASE_URL, "Both QA and production identities must be known");
  assert.equal(host(url), host(qa.DATABASE_URL), "Only the dedicated experience QA clone is allowed");
  assert.notEqual(host(url), host(production.DATABASE_URL), "Never run integration fixtures against production");
  if (process.env.DATABASE_URL_UNPOOLED) assert.equal(host(process.env.DATABASE_URL_UNPOOLED), host(url), "Direct connection must target the same QA branch");
}
