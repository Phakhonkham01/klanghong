import Link from "next/link";
import { ArrowLeft, KeyRound, LogOut } from "lucide-react";
import { signOutAction } from "@/app/(auth)/actions";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { homeFor, profileLabel, requireSession } from "@/lib/auth";
import { lo } from "@/lib/i18n/lo";

export const metadata = { title: lo.changePassword.title };

export default async function Page() {
  // Also reachable while awaiting approval (forgot password).
  const { profile } = await requireSession(undefined, { allowOnboarding: true });
  // Required change (first sign-in, reset): the app is locked until it's done, so the way out is
  // signing out. Voluntary change (from the profile): go back.
  const required = profile.must_change_password || profile.must_set_name;
  const back = profile.role === "committee" ? homeFor("committee") : "/profile";

  return (
    <div className="flex min-h-dvh flex-col px-4 py-4">
      <div className="mx-auto w-full max-w-sm">
        {required ? (
          <form action={signOutAction}>
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl px-2 text-sm font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <LogOut className="size-4" /> {lo.nav.logout}
            </button>
          </form>
        ) : (
          <Link
            href={back}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl px-2 text-sm font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> {lo.common.back}
          </Link>
        )}
      </div>

      <div className="grid flex-1 place-items-center py-6">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <span className="grid size-20 press-3d place-items-center rounded-3xl bg-sky text-white [--press-shade:var(--sky-shade)] active:transform-none">
              <KeyRound className="size-10" strokeWidth={2.4} aria-hidden />
            </span>
            <h1 className="text-2xl font-bold">{lo.changePassword.title}</h1>
            <p className="text-sm text-muted-foreground">
              {profile.full_name} · <span className="money">{profileLabel(profile)}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              {required ? lo.changePassword.subtitle : lo.changePassword.subtitleOptional}
            </p>
          </div>
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
