import { describe, expect, it } from "vitest";
import { MAX_FILE_BYTES, safeFilename, validateUpload } from "../services/upload-validation";

const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
const pdf = Buffer.from("%PDF-1.4 fake body");

describe("validateUpload", () => {
  it("accepts a real PNG and PDF", () => {
    expect(validateUpload("shot.png", "image/png", png)).toEqual({ ok: true, mime: "image/png", ext: "png" });
    expect(validateUpload("brief.PDF", "application/pdf", pdf)).toMatchObject({ ok: true, ext: "pdf" });
  });
  it("rejects empty and oversized files", () => {
    expect(validateUpload("a.png", "image/png", Buffer.alloc(0))).toMatchObject({ ok: false });
    expect(validateUpload("a.png", "image/png", Buffer.concat([png, Buffer.alloc(MAX_FILE_BYTES)]))).toMatchObject({ ok: false, reason: expect.stringContaining("25 MB") });
  });
  it("rejects disallowed extensions even with a friendly MIME", () => {
    expect(validateUpload("payload.exe", "image/png", png)).toMatchObject({ ok: false });
    expect(validateUpload("script.html", "text/plain", Buffer.from("<html>"))).toMatchObject({ ok: false });
    expect(validateUpload("noext", "image/png", png)).toMatchObject({ ok: false });
  });
  it("rejects files whose bytes do not match the extension", () => {
    expect(validateUpload("fake.png", "image/png", pdf)).toMatchObject({ ok: false, reason: expect.stringContaining("do not match") });
    expect(validateUpload("fake.pdf", "application/pdf", png)).toMatchObject({ ok: false });
  });
  it("normalises a wrong declared MIME to the canonical one", () => {
    expect(validateUpload("shot.png", "application/octet-stream", png)).toMatchObject({ ok: true, mime: "image/png" });
  });
  it("accepts clean SVGs and rejects scripted ones", () => {
    expect(validateUpload("logo.svg", "image/svg+xml", Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>'))).toMatchObject({ ok: true });
    expect(validateUpload("logo.svg", "image/svg+xml", Buffer.from("<svg><script>alert(1)</script></svg>"))).toMatchObject({ ok: false });
    expect(validateUpload("logo.svg", "image/svg+xml", Buffer.from('<svg onload="x()"></svg>'))).toMatchObject({ ok: false });
    expect(validateUpload("logo.svg", "image/svg+xml", Buffer.from("not an svg at all"))).toMatchObject({ ok: false });
  });
  it("accepts office documents packaged as zip", () => {
    const zip = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(16)]);
    expect(validateUpload("deck.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", zip)).toMatchObject({ ok: true });
    expect(validateUpload("deck.xlsx", "application/octet-stream", zip)).toMatchObject({ ok: true, mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  });
});

describe("safeFilename", () => {
  it("strips paths, separators and control characters", () => {
    expect(safeFilename("../../etc/passwd")).toBe("passwd");
    expect(safeFilename("a\\b/c.txt")).toBe("c.txt");
    expect(safeFilename(`bad${String.fromCharCode(7)}name${String.fromCharCode(0)}.png`)).toBe("badname.png");
  });
  it("never returns an empty name and caps the length", () => {
    expect(safeFilename("   ")).toBe("file");
    expect(safeFilename("x".repeat(400) + ".png").length).toBe(180);
  });
});
