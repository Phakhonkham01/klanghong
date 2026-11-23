"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, Smartphone } from "lucide-react";
import { signInPhoneAction, type FormState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { lo } from "@/lib/i18n/lo";

const field = "h-13 rounded-2xl border-2 bg-muted/40 px-4 text-base md:text-base";

/** Everyday sign-in for students: phone number + password. */
export function PhonePasswordLogin({ onForgot }: { onForgot: () => void }) {
  const [show, setShow] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(signInPhoneAction, {
    error: null,
  });
  return (
    <form action={action} className="space-y-3" noValidate>
      <div className="relative">
        <Smartphone className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="phone"
          key={state.code ?? ""}
          defaultValue={state.code}
          placeholder={lo.otp.phonePlaceholder}
          aria-label={lo.otp.phone}
          inputMode="tel"
          autoComplete="username"
          maxLength={20}
          className={`${field} pl-12 money`}
        />
      </div>
      <div className="relative">
        <Input
          name="password"
          type={show ? "text" : "password"}
          placeholder={lo.otp.password}
          aria-label={lo.otp.password}
          autoComplete="current-password"
          maxLength={72}
          className={`${field} pr-12`}
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
      <div className="flex justify-end">
        <button type="button" onClick={onForgot} className="text-sm font-bold text-sky">
          {lo.otp.forgot}
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
      <Button type="submit" variant="chunky" size="xl" className="w-full" disabled={pending}>
        {pending ? lo.otp.loggingIn : lo.otp.login}
      </Button>
    </form>
  );
}
