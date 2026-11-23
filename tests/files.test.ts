import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES, readImageUpload, sha256Hex, sniffImage } from "@/lib/files";

const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const jpg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const webp = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ");

describe("sniffImage", () => {
  it("detects jpeg, png and webp by magic bytes", () => {
    expect(sniffImage(jpg)?.ext).toBe("jpg");
    expect(sniffImage(png)?.ext).toBe("png");
    expect(sniffImage(webp)?.ext).toBe("webp");
  });

  it("rejects other content even if it claims to be an image", () => {
    expect(sniffImage(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
    expect(sniffImage(new TextEncoder().encode("%PDF-1.7"))).toBeNull();
    expect(sniffImage(new Uint8Array())).toBeNull();
  });
});

describe("readImageUpload", () => {
  it("accepts a real png and hashes it", async () => {
    const r = await readImageUpload(new File([png], "a.png", { type: "image/png" }));
    expect(r.ok && r.kind.mime).toBe("image/png");
    expect(r.ok && r.sha256).toBe(sha256Hex(png));
  });

  it("rejects missing, oversized and disguised files", async () => {
    expect(await readImageUpload(null)).toEqual({ ok: false, reason: "missing" });
    const big = new File([new Uint8Array(MAX_UPLOAD_BYTES + 1)], "b.jpg");
    expect(await readImageUpload(big)).toEqual({ ok: false, reason: "too_large" });
    const fake = new File(["<html>"], "c.png", { type: "image/png" });
    expect(await readImageUpload(fake)).toEqual({ ok: false, reason: "not_image" });
  });
});
