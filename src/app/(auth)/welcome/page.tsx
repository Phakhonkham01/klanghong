import { redirect } from "next/navigation";
import { UserRound } from "lucide-react";
import { NameForm } from "@/components/auth/name-form";
import { requireSession } from "@/lib/auth";
import { lo } from "@/lib/i18n/lo";
import { formatPhone } from "@/lib/phone";

export const metadata = { title: lo.welcome.title };

export default async function Page() {
  const { profile } = await requireSession(undefined, { allowOnboarding: true });
  if (!profile.must_set_name) redirect(profile.approval === "approved" ? "/dashboard" : "/pending");
  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="grid size-20 press-3d place-items-center rounded-3xl bg-primary text-primary-foreground [--press-shade:var(--brand-shade)] active:transform-none">
            <UserRound className="size-10" strokeWidth={2.4} aria-hidden />
          </span>
          <h1 className="text-2xl font-bold">{lo.welcome.title}</h1>
          <p className="money text-sm text-muted-foreground">{formatPhone(profile.phone)}</p>
          <p className="text-sm text-muted-foreground">{lo.welcome.subtitle}</p>
        </div>
        <NameForm />
      </div>
    </div>
  );
}
