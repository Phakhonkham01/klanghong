import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

const PUBLIC_PATHS = ["/login"];

/**
 * Refreshes the Supabase session cookie on every request and guards routes:
 * - signed out → /login (remembering where they were going)
 * - inactive profile → signed out
 * - must_change_password → /change-password until done
 * - students cannot open /committee/*
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          for (const { name, value } of toSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
        },
      },
    },
  );

  // Must be called right after creating the client: validates and refreshes the session.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.includes(pathname);

  const go = (path: string, params?: Record<string, string>) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = params ? `?${new URLSearchParams(params)}` : "";
    const redirect = NextResponse.redirect(url);
    // Keep any refreshed auth cookies.
    for (const c of response.cookies.getAll()) redirect.cookies.set(c);
    return redirect;
  };

  if (!user) {
    if (isPublic) return response;
    return pathname === "/" ? go("/login") : go("/login", { next: pathname + search });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active, must_change_password")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    return isPublic ? response : go("/login");
  }

  const home = profile.role === "committee" ? "/committee" : "/dashboard";

  if (profile.must_change_password) {
    return pathname === "/change-password" ? response : go("/change-password");
  }
  if (isPublic || pathname === "/") return go(home);
  if (pathname.startsWith("/committee") && profile.role !== "committee") return go("/dashboard");

  return response;
}

export const config = {
  matcher: [
    // Everything except static files and images.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
