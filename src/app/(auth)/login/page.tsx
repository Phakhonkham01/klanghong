import { PiggyBank } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { lo } from "@/lib/i18n/lo";

export const metadata = { title: lo.login.submit };

export default function Page() {
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
          <LoginForm />
        </div>
      </section>
    </div>
  );
}
