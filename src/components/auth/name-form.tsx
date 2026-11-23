"use client";

import { useActionState } from "react";
import { setupAccountAction, type FormState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { lo } from "@/lib/i18n/lo";
import { PASSWORD_MAX } from "@/lib/validators";

const field = "h-13 rounded-2xl border-2 bg-muted/40 px-4 text-base md:text-base";

/** First sign-in: full name + a password for future sign-ins without OTP. */
export function NameForm({ phone }: { phone: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(setupAccountAction, {
    error: null,
  });
  return (
    <form action={action} className="space-y-3" noValidate>
      {/* Lets password managers save the phone as the username. */}
      <input type="text" name="username" autoComplete="username" value={phone} hidden readOnly />
      <Input
        name="name"
        placeholder={lo.welcome.namePlaceholder}
        aria-label={lo.welcome.name}
        autoComplete="name"
        maxLength={80}
        required
        autoFocus
        className={field}
      />
      <Input
        name="password"
        type="password"
        placeholder={lo.changePassword.newPassword}
        aria-label={lo.changePassword.newPassword}
        autoComplete="new-password"
        maxLength={PASSWORD_MAX}
        required
        className={field}
      />
      <Input
        name="confirm"
        type="password"
        placeholder={lo.changePassword.confirm}
        aria-label={lo.changePassword.confirm}
        autoComplete="new-password"
        maxLength={PASSWORD_MAX}
        required
        className={field}
      />
      <p className="text-xs text-muted-foreground">{lo.changePassword.hint}</p>
      {state.error ? (
        <p
          role="alert"
          className="rounded-xl bg-status-rejected-bg px-3 py-2 text-sm font-semibold text-status-rejected"
        >
          {state.error}
        </p>
      ) : null}
      <Button type="submit" variant="chunky" size="xl" className="w-full" disabled={pending}>
        {pending ? lo.common.loading : lo.welcome.save}
      </Button>
    </form>
  );
}
