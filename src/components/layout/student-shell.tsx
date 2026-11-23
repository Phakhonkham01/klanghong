"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Brand } from "./brand";
import { isActive, studentNav } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";

/** Routes that run full-screen, without header and bottom nav (focused flows). */
const FOCUS_ROUTES = ["/pay"];

export function StudentShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (FOCUS_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))) {
    return <div className="min-h-dvh">{children}</div>;
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-xl items-center justify-between px-4">
          <Brand href="/dashboard" />
          <nav className="hidden items-center gap-1 md:flex" aria-label="main">
            {studentNav.map((item) => {
              const active = isActive(pathname, item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl border-2 border-transparent px-3 py-1.5 text-sm font-bold text-muted-foreground transition-colors hover:bg-muted",
                    active && "border-brand/40 bg-accent text-accent-foreground",
                  )}
                >
                  <Icon className="size-4" strokeWidth={2.6} aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 pb-28 md:pb-10">{children}</main>

      <nav
        aria-label="bottom"
        className="fixed inset-x-0 bottom-0 z-30 border-t-2 bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-4 gap-2 px-3 py-2">
          {studentNav.map((item) => {
            const active = isActive(pathname, item);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-14 flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-transparent text-[11px] font-bold text-muted-foreground",
                    active && "border-sky/50 bg-sky/10 text-sky",
                  )}
                >
                  <Icon className="size-6" strokeWidth={active ? 2.8 : 2.2} aria-hidden />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
