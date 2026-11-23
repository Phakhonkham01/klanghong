import Link from "next/link";
import { redirect } from "next/navigation";
import { Hourglass, XCircle } from "lucide-react";
import { signOutAction } from "@/app/(auth)/actions";
import { buttonVariants } from "@/components/ui/button";
import { homeFor, requireSession } from "@/lib/auth";
import { lo } from "@/lib/i18n/lo";
import { formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

export const metadata = { title: lo.pending.title };

export default async function Page() {
  const { profile } = await requireSession(undefined, { allowOnboarding: true });
  if (profile.must_set_name) redirect("/welcome");
  if (profile.approval === "approved") redirect(homeFor(profile.role));
  const rejected = profile.approval === "rejected";
  const Icon = rejected ? XCircle : Hourglass;
  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm text-center">
        <span
          className={cn(
            "mx-auto grid size-24 press-3d place-items-center rounded-full text-white active:transform-none",
            rejected
              ? "bg-status-rejected [--press-shade:color-mix(in_oklch,var(--status-rejected),black_25%)]"
              : "bg-status-pending [--press-shade:color-mix(in_oklch,var(--status-pending),black_25%)]",
          )}
        >
          <Icon className="size-12" strokeWidth={2.4} aria-hidden />
        </span>
        <h1 className="mt-5 text-2xl font-bold">
          {rejected ? lo.pending.rejectedTitle : lo.pending.title}
        </h1>
        <p className="mt-1 font-semibold">{profile.full_name}</p>
        <p className="money text-sm text-muted-foreground">{formatPhone(profile.phone)}</p>
        <p className="mt-4 text-sm text-muted-foreground">
          {rejected ? lo.pending.rejectedBody : lo.pending.body}
        </p>
        <div className="mt-6 space-y-3">
          {!rejected ? (
            <Link
              href="/pending"
              className={cn(buttonVariants({ variant: "chunky", size: "xl" }), "w-full")}
            >
              {lo.pending.refresh}
            </Link>
          ) : null}
          <form action={signOutAction}>
            <button type="submit" className="w-full py-2 text-sm font-bold text-destructive">
              {lo.nav.logout}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
