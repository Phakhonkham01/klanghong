import { PiggyBank } from "lucide-react";
import { GoogleButton } from "@/components/auth/google-button";
import { LoginForm } from "@/components/auth/login-form";
import { isGoogleEnabled } from "@/lib/auth-providers";
import { lo } from "@/lib/i18n/lo";
import { safeNextPath } from "@/lib/validators";

export const metadata = { title: lo.login.submit };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const google = await isGoogleEnabled();
  const next = safeNextPath(params.next) ?? undefined;
  const errors = lo.login.errors as Record<string, string>;
  const error = params.error && Object.hasOwn(errors, params.error) ? errors[params.error] : null;
  return (
    <div className="flex min-h-dvh flex-col bg-primary">
      {/* Splash-style brand area */}
      <section className="flex flex-1 flex-col items-center justify-center gap-4 px-6 pt-14 pb-16 text-primary-foreground">
        <span className="grid size-28 place-items-center rounded-[2rem] bg-white/95 text-primary shadow-[0_8px_0_0_var(--brand-shade)]">
          <PiggyBank className="size-16" strokeWidth={2.2} aria-hidden />
        </span>
        <h1 className="text-5xl leading-tight font-black">{lo.app.name}</h1>
        <p className="max-w-xs text-center text-base font-semibold text-primary-foreground/90">
          {lo.app.tagline}
        </p>
      </section>

      {/* Form sheet */}
      <section className="-mt-6 rounded-t-[2rem] bg-background px-6 pt-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-sm">
          <h2 className="text-2xl font-bold">{lo.login.welcome}</h2>
          <p className="mb-6 text-sm text-muted-foreground">{lo.login.subtitle}</p>
          {error ? (
            <p
              role="alert"
              className="mb-4 rounded-xl bg-status-rejected-bg px-3 py-2 text-sm font-semibold text-status-rejected"
            >
              {error}
            </p>
          ) : null}
          <LoginForm next={next} />
          {google ? (
            <>
              <div className="my-5 flex items-center gap-3 text-xs font-bold text-muted-foreground">
                <span className="h-0.5 flex-1 rounded bg-border" />
                {lo.login.or}
                <span className="h-0.5 flex-1 rounded bg-border" />
              </div>
              <GoogleButton next={next} />
              <p className="mt-2 text-center text-xs text-muted-foreground">
                {lo.login.googleHint}
              </p>
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}
