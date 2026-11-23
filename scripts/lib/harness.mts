/**
 * Shared helpers for end-to-end scripts: real Supabase sessions, page fetches, and calling
 * Next server actions over HTTP the way the React client does.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export const BASE = process.env.APP_URL ?? "http://localhost:3000";
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const admin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

let failures = 0;
export function check(name: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${name}${!ok && detail ? ` — ${detail}` : ""}`);
}
export function fail() {
  failures++;
}
export function failureCount() {
  return failures;
}

export async function signIn(email: string, password: string): Promise<string> {
  const jar = new Map<string, string>();
  const ssr = createServerClient(SUPABASE_URL, ANON_KEY, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) =>
        list.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
    },
  });
  const { error } = await ssr.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signIn ${email}: ${error.message}`);
  return [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
}

export async function page(path: string, cookie = "") {
  const res = await fetch(BASE + path, { headers: { cookie }, redirect: "manual" });
  const loc = res.headers.get("location");
  return {
    status: res.status,
    location: loc ? new URL(loc, BASE).pathname : null,
    html: await res.text(),
  };
}

/** Find server action ids in compiled client chunks (Turbopack dev output). */
export function findActionIds(): Map<string, string> {
  const ids = new Map<string, string>();
  const walk = (dir: string) => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (f.endsWith(".js")) {
        const src = readFileSync(p, "utf8");
        const re =
          /createServerReference"?\]?\)?\(\s*"([0-9a-f]{40,})"[\s\S]{0,1200}?"(\w+Action)"\)/g;
        for (const m of src.matchAll(re)) ids.set(m[2]!, m[1]!);
      }
    }
  };
  for (const r of [".next/static/chunks", ".next/server"]) {
    try {
      walk(r);
    } catch {
      /* missing */
    }
  }
  return ids;
}

export type ActionResponse = {
  status: number;
  /** Plain value returned by the action (first RSC row that looks like a result). */
  result: Record<string, unknown> | null;
  /** Target of redirect() inside the action, if any. */
  redirect: string | null;
  /** Cookies the action set (e.g. a new session). */
  cookie: string;
};

/** args: JSON-serialisable arguments, or [state, FormData] for useActionState forms. */
export async function callAction(
  ids: Map<string, string>,
  name: string,
  cookie: string,
  args: unknown[],
  pagePath = "/",
): Promise<ActionResponse> {
  const id = ids.get(name);
  if (!id) throw new Error(`action id not found: ${name}`);
  const headers: Record<string, string> = { cookie, "next-action": id, accept: "text/x-component" };
  let body: BodyInit;
  const formIndex = args.findIndex((a) => a instanceof FormData);
  if (formIndex >= 0) {
    // React encodeReply layout: referenced FormData entries first ("_1_" prefix), root model last.
    const fd = new FormData();
    for (const [k, v] of (args[formIndex] as FormData).entries()) fd.append(`_1_${k}`, v);
    const root = args.map((a, i) => (i === formIndex ? "$K1" : a));
    fd.append("0", JSON.stringify(root));
    body = fd;
  } else {
    body = JSON.stringify(args);
    headers["content-type"] = "text/plain;charset=UTF-8";
  }
  const res = await fetch(BASE + pagePath, { method: "POST", headers, body, redirect: "manual" });
  const text = await res.text();

  const rows = new Map<string, unknown>();
  for (const line of text.split("\n")) {
    const m = line.match(/^([0-9a-f]+):(.*)$/);
    if (!m) continue;
    try {
      rows.set(m[1]!, JSON.parse(m[2]!));
    } catch {
      /* not JSON */
    }
  }
  const resolve = (v: unknown, depth = 0): unknown => {
    if (depth > 20) return v;
    if (typeof v === "string" && /^\$@?[0-9a-f]+$/.test(v)) {
      return resolve(rows.get(v.replace(/^\$@?/, "")), depth + 1);
    }
    if (Array.isArray(v)) return v.map((x) => resolve(x, depth + 1));
    if (v && typeof v === "object") {
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resolve(x, depth + 1)]));
    }
    return v;
  };
  // Next puts the action's return value in row 0 as `a` (row 0 also carries the refreshed tree).
  let result: Record<string, unknown> | null = null;
  const root = resolve(rows.get("0"));
  if (root && typeof root === "object" && "a" in root) {
    const a = (root as Record<string, unknown>).a;
    result = a && typeof a === "object" ? (a as Record<string, unknown>) : null;
  } else if (root && typeof root === "object" && ("ok" in root || "error" in root)) {
    result = root as Record<string, unknown>;
  }

  const setCookies = res.headers.getSetCookie?.() ?? [];
  const jar = new Map(
    cookie
      .split("; ")
      .filter(Boolean)
      .map((c) => [c.split("=")[0]!, c.slice(c.indexOf("=") + 1)]),
  );
  for (const sc of setCookies) {
    const [pair] = sc.split(";");
    const name = pair!.split("=")[0]!;
    const value = pair!.slice(name.length + 1);
    if (value) jar.set(name, value);
    else jar.delete(name);
  }
  const redirectHeader = res.headers.get("x-action-redirect");
  return {
    status: res.status,
    result,
    redirect: redirectHeader ? redirectHeader.split(";")[0]! : null,
    cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "),
  };
}
