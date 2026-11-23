"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lo } from "@/lib/i18n/lo";
import { LoginForm } from "./login-form";
import { PhoneLogin } from "./phone-login";
import { PhonePasswordLogin } from "./phone-password-login";
import { REVEAL_COMMITTEE_EVENT } from "./secret-logo";

type Mode = "login" | "signup" | "reset" | "committee";

function BackLink({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" /> {label}
    </button>
  );
}

/**
 * Students: sign in with phone + password, sign up (or reset a password) with SMS OTP.
 * Committee: code + password, shown only after tapping the logo three times.
 */
export function LoginTabs({ next }: { next?: string }) {
  const [mode, setMode] = useState<Mode>("login");

  useEffect(() => {
    const reveal = () => setMode("committee");
    window.addEventListener(REVEAL_COMMITTEE_EVENT, reveal);
    return () => window.removeEventListener(REVEAL_COMMITTEE_EVENT, reveal);
  }, []);

  if (mode === "committee") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-bold">{lo.otp.tabCommittee}</p>
          <BackLink onClick={() => setMode("login")} label={lo.otp.tabStudent} />
        </div>
        <LoginForm next={next} />
      </div>
    );
  }

  if (mode === "reset") {
    return (
      <div className="space-y-4">
        <BackLink onClick={() => setMode("login")} label={lo.otp.backToLogin} />
        <p className="font-bold">{lo.otp.resetTitle}</p>
        <PhoneLogin key="reset" purpose="reset" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2" role="group">
        {(["login", "signup"] as const).map((k) => (
          <Button
            key={k}
            type="button"
            variant="tile"
            className="h-11"
            aria-pressed={mode === k}
            onClick={() => setMode(k)}
          >
            {k === "login" ? lo.otp.tabLogin : lo.otp.tabSignup}
          </Button>
        ))}
      </div>
      {mode === "login" ? (
        <PhonePasswordLogin onForgot={() => setMode("reset")} />
      ) : (
        <PhoneLogin key="signup" purpose="signup" />
      )}
    </div>
  );
}
