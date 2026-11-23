import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { PROFILE_HEADER, encodeProfileHeader } from "@/lib/profile-header";
import type { Database } from "@/types/database";

const PUBLIC_PATHS = ["/login"];

/**
 * Refreshes the Supabase session cookie on every request and guards routes:
 * - signed out → /login (remembering where they were going)
 * - inactive profile → signed out
 * - phone sign-ups: must_set_name → /welcome (name + password)
 * - must_change_password → /change-password until done
 * - not yet approved → /pending
 * - students cannot open /committee/*
 *
 * The verified profile is forwarded to pages and server actions in a request header so they
 * don't repeat the auth + profile round trips. Any incoming copy of that header is removed first.
 */
export async function middleware(request: NextRequest) {
  const forwarded = new Headers(request.headers);
  forwarded.delete(PROFILE_HEADER); // never trust a client-supplied value
  const cookieUpdates: { name: string; value: string; options: CookieOptions }[] = [];

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          for (const c of toSet) {
            request.cookies.set(c.name, c.value);
            cookieUpdates.push(c);
          }
        },
      },
    },
  );

  // Verifies the JWT (locally once the project uses asymmetric signing keys) and refreshes it.
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  const { pathname, search } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.includes(pathname);

  const withCookies = <T extends NextResponse>(res: T): T => {
    for (const c of cookieUpdates) res.cookies.set(c.name, c.value, c.options);
    return res;
  };
  const pass = () => {
    // Refreshed auth cookies must reach both the page (request) and the browser (response).
    forwarded.set("cookie", request.cookies.toString());
    return withCookies(NextResponse.next({ request: { headers: forwarded } }));
  };
  const go = (path: string, params?: Record<string, string>) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = params ? `?${new URLSearchParams(params)}` : "";
    return withCookies(NextResponse.redirect(url));
  };

  if (!userId) {
    if (isPublic) return pass();
    return pathname === "/" ? go("/login") : go("/login", { next: pathname + search });
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single();

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    return isPublic ? pass() : go("/login");
  }

  const home = profile.role === "committee" ? "/committee" : "/dashboard";

  if (profile.must_set_name) {
    if (pathname !== "/welcome") return go("/welcome");
  } else if (profile.must_change_password) {
    if (pathname !== "/change-password") return go("/change-password");
  } else if (profile.approval !== "approved") {
    if (pathname !== "/pending") return go("/pending");
  } else {
    if (pathname === "/welcome" || pathname === "/pending") return go(home);
    if (isPublic || pathname === "/") return go(home);
    if (pathname.startsWith("/committee") && profile.role !== "committee") {
      return go("/dashboard");
    }
  }

  forwarded.set(PROFILE_HEADER, encodeProfileHeader(profile));
  return pass();
}

export const config = {
  matcher: [
    // Everything except static files and images.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
