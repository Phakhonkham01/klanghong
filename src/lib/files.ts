import { createHash } from "node:crypto";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export type ImageKind = {
  mime: "image/jpeg" | "image/png" | "image/webp";
  ext: "jpg" | "png" | "webp";
};

/** Identify an image from its magic bytes; never trust the declared MIME type. */
export function sniffImage(bytes: Uint8Array): ImageKind | null {
  const b = bytes;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  if (
    b.length >= 8 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a
  ) {
    return { mime: "image/png", ext: "png" };
  }
  if (
    b.length >= 12 &&
    String.fromCharCode(b[0]!, b[1]!, b[2]!, b[3]!) === "RIFF" &&
    String.fromCharCode(b[8]!, b[9]!, b[10]!, b[11]!) === "WEBP"
  ) {
    return { mime: "image/webp", ext: "webp" };
  }
  return null;
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export type UploadCheck =
  | { ok: true; bytes: Uint8Array; kind: ImageKind; sha256: string }
  | { ok: false; reason: "missing" | "too_large" | "not_image" };

/** Read and validate an uploaded image File from FormData. */
export async function readImageUpload(value: FormDataEntryValue | null): Promise<UploadCheck> {
  if (!value || typeof value === "string" || value.size === 0)
    return { ok: false, reason: "missing" };
  if (value.size > MAX_UPLOAD_BYTES) return { ok: false, reason: "too_large" };
  const bytes = new Uint8Array(await value.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind) return { ok: false, reason: "not_image" };
  return { ok: true, bytes, kind, sha256: sha256Hex(bytes) };
}
