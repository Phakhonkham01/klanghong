import { KeyRound } from "lucide-react";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { profileLabel, requireSession } from "@/lib/auth";
import { lo } from "@/lib/i18n/lo";

export const metadata = { title: lo.changePassword.title };

export default async function Page() {
  // Also reachable while awaiting approval (forgot password).
  const { profile } = await requireSession(undefined, { allowOnboarding: true });
  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="grid size-20 press-3d place-items-center rounded-3xl bg-sky text-white [--press-shade:var(--sky-shade)] active:transform-none">
            <KeyRound className="size-10" strokeWidth={2.4} aria-hidden />
          </span>
          <h1 className="text-2xl font-bold">{lo.changePassword.title}</h1>
          <p className="text-sm text-muted-foreground">
            {profile.full_name} · <span className="money">{profileLabel(profile)}</span>
          </p>
          <p className="text-sm text-muted-foreground">{lo.changePassword.subtitle}</p>
        </div>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
