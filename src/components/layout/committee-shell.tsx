"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Ellipsis, LogOut, UserRound } from "lucide-react";
import { signOutAction } from "@/app/(auth)/actions";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { lo } from "@/lib/i18n/lo";
import { cn } from "@/lib/utils";
import { QuickExpenseButton } from "@/components/committee/quick-expense";
import { AppVersion } from "./app-version";
import { Brand } from "./brand";
import { committeeNav, isActive, type NavItem } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";

/** Things waiting for the committee, by page: slips to review, sign-ups to approve. */
export type NavBadges = Partial<Record<string, number>>;

/** Red count bubble; nothing when zero. */
function CountBadge({ n, className }: { n?: number; className?: string }) {
  if (!n) return null;
  return (
    <span
      className={cn(
        "grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1.5 money text-[11px] leading-none font-black text-white ring-2 ring-background",
        className,
      )}
    >
      {n > 99 ? "99+" : n}
      <span className="sr-only"> {lo.nav.waiting}</span>
    </span>
  );
}

function NavList({
  pathname,
  badges = {},
  onNavigate,
}: {
  pathname: string;
  badges?: NavBadges;
  onNavigate?: () => void;
}) {
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
                "flex min-h-11 items-center gap-3 rounded-xl border-2 border-transparent px-3 text-sm font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                active && "border-sky/50 bg-sky/10 text-sky",
              )}
            >
              <Icon className="size-5" strokeWidth={active ? 2.6 : 2.2} aria-hidden />
              {item.label}
              <CountBadge n={badges[item.href]} className="ml-auto" />
            </Link>
          </li>
        );
      })}
      <li className="mt-2 border-t-2 pt-2">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <UserRound className="size-5" aria-hidden />
          {lo.nav.studentArea}
        </Link>
      </li>
      <li>
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-bold text-destructive hover:bg-destructive/10"
          >
            <LogOut className="size-5" aria-hidden />
            {lo.nav.logout}
          </button>
        </form>
        <AppVersion className="px-3 pt-1" />
      </li>
    </ul>
  );
}

/** Phone bottom bar: the 4 most used pages, the rest under "more". */
const PRIMARY = committeeNav.slice(0, 4);
const MORE = committeeNav.slice(4);

const tabClass =
  "flex h-14 flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-transparent text-[11px] font-bold whitespace-nowrap text-muted-foreground";

function BottomNav({
  pathname,
  badges = {},
  onMore,
}: {
  pathname: string;
  badges?: NavBadges;
  onMore: () => void;
}) {
  const moreActive = MORE.some((item) => isActive(pathname, item));
  return (
    <nav
      aria-label="bottom"
      className="fixed inset-x-0 bottom-0 z-30 border-t-2 bg-background pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5 gap-1.5 px-2 py-2">
        {PRIMARY.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(tabClass, active && "border-sky/50 bg-sky/10 text-sky")}
              >
                <span className="relative">
                  <Icon className="size-6" strokeWidth={active ? 2.8 : 2.2} aria-hidden />
                  <CountBadge n={badges[item.href]} className="absolute -top-2 -right-3" />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={onMore}
            className={cn(tabClass, "w-full", moreActive && "border-sky/50 bg-sky/10 text-sky")}
          >
            <Ellipsis className="size-6" strokeWidth={moreActive ? 2.8 : 2.2} aria-hidden />
            {lo.nav.more}
          </button>
        </li>
      </ul>
    </nav>
  );
}

function MoreTile({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate: () => void;
}) {
  const active = isActive(pathname, item);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 px-2 py-3 text-center text-xs leading-tight font-bold text-muted-foreground hover:bg-muted",
        active && "border-sky/50 bg-sky/10 text-sky",
      )}
    >
      <Icon className="size-6" strokeWidth={active ? 2.6 : 2.2} aria-hidden />
      {item.label}
    </Link>
  );
}

export function CommitteeShell({
  children,
  badges = {},
}: {
  children: React.ReactNode;
  badges?: NavBadges;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r-2 bg-sidebar p-4 lg:flex">
        <Brand href="/committee" />
        <nav aria-label={lo.nav.committeeArea}>
          <NavList pathname={pathname} badges={badges} />
        </nav>
        <div className="mt-auto">
          <ThemeToggle />
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-background/90 px-4 backdrop-blur lg:hidden">
          <Brand href="/committee" />
          <ThemeToggle />
        </header>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-3xl p-4">
            <SheetHeader className="p-0">
              <SheetTitle>{lo.nav.more}</SheetTitle>
            </SheetHeader>
            <nav aria-label={lo.nav.more} className="grid grid-cols-3 gap-2">
              {MORE.map((item) => (
                <MoreTile key={item.href} item={item} pathname={pathname} onNavigate={close} />
              ))}
              <MoreTile
                item={{ href: "/dashboard", label: lo.nav.studentArea, icon: UserRound }}
                pathname={pathname}
                onNavigate={close}
              />
            </nav>
            <form action={signOutAction}>
              <button
                type="submit"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-destructive/30 text-sm font-bold text-destructive hover:bg-destructive/10"
              >
                <LogOut className="size-5" aria-hidden />
                {lo.nav.logout}
              </button>
            </form>
            <AppVersion className="text-center" />
          </SheetContent>
        </Sheet>
        <main className="mx-auto max-w-6xl px-4 pt-4 pb-44 lg:px-8 lg:pt-6 lg:pb-28">
          {children}
        </main>
        <BottomNav pathname={pathname} badges={badges} onMore={() => setOpen(true)} />
        <QuickExpenseButton />
      </div>
    </div>
  );
}
