"use client";

import { useActionState } from "react";
import { changePasswordAction, type FormState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { lo } from "@/lib/i18n/lo";
import { PASSWORD_MAX } from "@/lib/validators";

const field = "h-13 rounded-2xl border-2 bg-muted/40 px-4 text-base md:text-base";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(changePasswordAction, {
    error: null,
  });
  return (
    <form action={action} className="space-y-3" noValidate>
      <input type="text" name="username" autoComplete="username" hidden readOnly />
      <Input
        name="password"
        type="password"
        placeholder={lo.changePassword.newPassword}
        aria-label={lo.changePassword.newPassword}
        aria-describedby="pw-hint"
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
      <p id="pw-hint" className="text-xs text-muted-foreground">
        {lo.changePassword.hint}
      </p>
      {state.error ? (
        <p
          role="alert"
          className="rounded-xl bg-status-rejected-bg px-3 py-2 text-sm font-semibold text-status-rejected"
        >
          {state.error}
        </p>
      ) : null}
      <Button type="submit" variant="chunky" size="xl" className="mt-2 w-full" disabled={pending}>
        {pending ? lo.changePassword.saving : lo.changePassword.submit}
      </Button>
    </form>
  );
}
