import "server-only";
import { headers } from "next/headers";

/**
 * Client IP for rate limits. Cloudflare sets `cf-connecting-ip` itself (a client cannot forge
 * it); elsewhere the proxy appends the real address as the LAST `x-forwarded-for` entry, while
 * earlier entries are whatever the client sent.
 */
export async function clientIp(): Promise<string | null> {
  const h = await headers();
  const cf = h.get("cf-connecting-ip")?.trim();
  if (cf) return cf.slice(0, 64);
  const xff = h
    .get("x-forwarded-for")
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return (xff?.at(-1) || h.get("x-real-ip") || null)?.slice(0, 64) ?? null;
}
