"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { lo } from "@/lib/i18n/lo";
import { cn } from "@/lib/utils";
import { Brand } from "./brand";
import { committeeNav, isActive } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <ul className="flex flex-col gap-1">
      {committeeNav.map((item) => {
        const active = isActive(pathname, item);
        const Icon = item.icon;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                active && "bg-sidebar-accent text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-5" aria-hidden />
              {item.label}
            </Link>
          </li>
        );
      })}
      <li className="mt-2 border-t pt-2">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <UserRound className="size-5" aria-hidden />
          {lo.nav.studentArea}
        </Link>
      </li>
    </ul>
  );
}

export function CommitteeShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r bg-sidebar p-4 lg:flex">
        <Brand href="/committee" />
        <nav aria-label={lo.nav.committeeArea}>
          <NavList pathname={pathname} />
        </nav>
        <div className="mt-auto">
          <ThemeToggle />
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/85 px-4 backdrop-blur lg:hidden">
          <Brand href="/committee" />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              className="size-10"
              aria-label={lo.nav.menu}
              onClick={() => setOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
          </div>
        </header>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl p-4">
            <SheetHeader className="p-0">
              <SheetTitle>{lo.nav.committeeArea}</SheetTitle>
            </SheetHeader>
            <nav aria-label={lo.nav.committeeArea}>
              <NavList pathname={pathname} onNavigate={() => setOpen(false)} />
            </nav>
          </SheetContent>
        </Sheet>
        <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
