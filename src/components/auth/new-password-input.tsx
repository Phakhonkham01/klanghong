"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { lo } from "@/lib/i18n/lo";
import { PASSWORD_MAX, stripPasswordChars } from "@/lib/validators";
import { cn } from "@/lib/utils";

/**
 * Field for choosing a password: only English letters, digits and symbols can be typed
 * (anything else, e.g. Lao or Thai, is dropped and a warning shows), with a show/hide toggle.
 */
export function NewPasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type" | "onChange">) {
  const [show, setShow] = useState(false);
  const [blocked, setBlocked] = useState(false);
  return (
    <div>
      <div className="relative">
        <Input
          {...props}
          type={show ? "text" : "password"}
          autoComplete="new-password"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={PASSWORD_MAX}
          onChange={(e) => {
            const clean = stripPasswordChars(e.target.value);
            setBlocked(clean !== e.target.value);
            if (clean !== e.target.value) e.target.value = clean;
          }}
          aria-invalid={blocked || undefined}
          className={cn(className, "pr-12")}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? lo.login.hidePassword : lo.login.showPassword}
          aria-pressed={show}
          className="absolute inset-y-0 right-1 grid w-11 place-items-center rounded-xl text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      </div>
      {blocked ? (
        <p role="alert" className="mt-1 px-1 text-xs font-semibold text-status-rejected">
          {lo.changePassword.invalidChars}
        </p>
      ) : null}
    </div>
  );
}
