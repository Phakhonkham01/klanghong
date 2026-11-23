"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { signInAction, type FormState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { lo } from "@/lib/i18n/lo";

const fieldClass = "h-13 rounded-2xl border-2 bg-muted/40 px-4 text-base md:text-base";

export function LoginForm({ next }: { next?: string }) {
  const [show, setShow] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(signInAction, {
    error: null,
  });

  return (
    <form action={action} className="space-y-3" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Input
        name="code"
        key={state.code ?? ""}
        defaultValue={state.code}
        placeholder={lo.login.studentCode}
        aria-label={lo.login.studentCode}
        autoComplete="username"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={20}
        required
        aria-invalid={state.error ? true : undefined}
        className={fieldClass}
      />
      <div className="relative">
        <Input
          name="password"
          type={show ? "text" : "password"}
          placeholder={lo.login.password}
          aria-label={lo.login.password}
          autoComplete="current-password"
          maxLength={72}
          required
          aria-invalid={state.error ? true : undefined}
          className={`${fieldClass} pr-12`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? lo.login.hidePassword : lo.login.showPassword}
          className="absolute inset-y-0 right-1 grid w-11 place-items-center rounded-xl text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      </div>
      {state.error ? (
        <p
          role="alert"
          className="rounded-xl bg-status-rejected-bg px-3 py-2 text-sm font-semibold text-status-rejected"
        >
          {state.error}
        </p>
      ) : null}
      <Button type="submit" variant="chunky" size="xl" className="mt-3 w-full" disabled={pending}>
        {pending ? lo.login.signingIn : lo.login.submit}
      </Button>
    </form>
  );
}
