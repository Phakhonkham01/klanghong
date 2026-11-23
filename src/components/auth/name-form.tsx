"use client";

import { useActionState } from "react";
import { setNameAction, type FormState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { lo } from "@/lib/i18n/lo";

export function NameForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(setNameAction, {
    error: null,
  });
  return (
    <form action={action} className="space-y-3" noValidate>
      <Input
        name="name"
        placeholder={lo.welcome.namePlaceholder}
        aria-label={lo.welcome.name}
        autoComplete="name"
        maxLength={80}
        required
        autoFocus
        className="h-13 rounded-2xl border-2 bg-muted/40 px-4 text-base md:text-base"
      />
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
