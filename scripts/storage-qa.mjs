// Runs only against an isolated QA deployment populated with randomized fixtures.
import assert from "node:assert/strict";
import { launchBrowser, qaPassword } from "./qa-runtime.mjs";

const base = process.argv[2] ?? "http://localhost:3000";
const browser = await launchBrowser();
const headers = { origin: base };
async function login(email) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${base}/login`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(qaPassword());
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(/\/(portal|admin)/);
  return { context, page, request: context.request };
}
try {
  const a = await login("maya@northbank.test");
  const b = await login("daniel@meridian.test");
  await a.page.goto(`${base}/portal/projects`);
  const project = await a.page.locator("a[href^='/portal/projects/']").first().getAttribute("href");
  const target = { projectId: project.split("/")[3] };
  const endpoint = `${base}/api/upload/chunks`;
  const begin = (input, request = a.request, origin = headers) => request.post(endpoint, { headers: origin, data: input });
  const data = { target, name: "qa-limit.txt", mime: "text/plain", size: 25 * 1024 * 1024 };
  assert.equal((await begin({ ...data, size: data.size + 1 })).status(), 422, "Reject over 25 MB");
  assert.equal((await begin(data, b.request)).status(), 403, "Reject cross-tenant project upload");
  assert.equal((await begin(data, a.request, { origin: "https://untrusted.invalid" })).status(), 403, "Reject foreign origin");
  const response = await begin(data);
  assert.equal(response.status(), 200, "Accept exactly 25 MB");
  const upload = await response.json();
  const partUrl = (part) => `${endpoint}?id=${upload.id}&part=${part}`;
  const stolen = await b.request.put(partUrl(0), { headers, data: Buffer.alloc(1) });
  if (stolen.status() !== 404) {
    const detail = await stolen.json().catch(() => ({}));
    console.log("Unexpected chunk denial", stolen.status(), typeof detail.error === "string" ? detail.error.slice(0, 160) : "Non-JSON response");
  }
  assert.equal(stolen.status(), 404, "Reject stolen upload session");
  assert.equal((await a.request.put(partUrl(-1), { headers, data: Buffer.alloc(1) })).status(), 422, "Reject invalid chunk index");
  assert.equal((await a.request.put(partUrl(0), { headers, data: Buffer.alloc(1) })).status(), 422, "Reject incomplete chunk");
  const bytes = Buffer.alloc(data.size, 65);
  for (let offset = 0, part = 0; offset < bytes.length; offset += upload.chunkBytes, part++) {
    const r = await a.request.put(partUrl(part), { headers, data: bytes.subarray(offset, offset + upload.chunkBytes) });
    assert.equal(r.status(), 200, `Upload chunk ${part}`);
  }
  const finished = await a.request.post(`${endpoint}?id=${upload.id}&finish=1`, { headers });
  assert.equal(finished.status(), 200, "Finalize complete 25 MB upload");
  const file = (await finished.json()).file;
  const downloadUrl = `${base}/api/files/${file.id}`;
  const download = await a.request.get(downloadUrl);
  assert.equal(download.status(), 200, "Authorized signed R2 download");
  assert.deepEqual(await download.body(), bytes, "Preserve uploaded bytes");
  assert.equal((await b.request.get(downloadUrl)).status(), 404, "Block cross-tenant download");
  const anonymous = await browser.newContext();
  assert.equal((await anonymous.request.get(downloadUrl)).status(), 401, "Block anonymous download");
  const forged = await begin({ ...data, name: "qa-forged.png", mime: "image/png", size: 12 });
  const fake = await forged.json();
  assert.equal((await a.request.put(`${endpoint}?id=${fake.id}&part=0`, { headers, data: Buffer.alloc(12, 65) })).status(), 200);
  assert.equal((await a.request.post(`${endpoint}?id=${fake.id}&finish=1`, { headers })).status(), 422, "Reject invalid magic bytes after assembly");
  console.log("PASS: 25 MB boundary, chunk ownership, origin protection, byte integrity, signed downloads, tenant isolation, anonymous denial and magic-byte validation");
} finally {
  await browser.close();
}
