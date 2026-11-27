import { LoginTabs } from "@/components/auth/login-tabs";
import { SecretLogo } from "@/components/auth/secret-logo";
import { lo } from "@/lib/i18n/lo";
import { safeNextPath } from "@/lib/validators";

export const metadata = { title: lo.login.submit };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next) ?? undefined;
  const errors = lo.login.errors as Record<string, string>;
  const error = params.error && Object.hasOwn(errors, params.error) ? errors[params.error] : null;
  return (
    <div className="flex min-h-dvh flex-col bg-primary">
      {/* Splash-style brand area */}
      {/* Compact (not flex-1) so the form sheet sits higher on the screen. */}
      <section className="flex flex-col items-center justify-center gap-4 px-6 pt-14 pb-[4.75rem] text-primary-foreground">
        <SecretLogo />
        <h1 className="text-5xl leading-tight font-black">{lo.app.name}</h1>
        <p className="max-w-xs text-center text-base font-semibold text-primary-foreground/90">
          {lo.app.tagline}
        </p>
      </section>

      {/* Form sheet */}
      <section className="-mt-6 flex-1 rounded-t-[2rem] bg-background px-6 pt-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
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
          <LoginTabs next={next} />
        </div>
      </section>
    </div>
  );
}
