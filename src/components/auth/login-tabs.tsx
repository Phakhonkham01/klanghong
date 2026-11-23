"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { lo } from "@/lib/i18n/lo";
import { LoginForm } from "./login-form";
import { PhoneLogin } from "./phone-login";

/** Students sign in by phone + OTP; committee members by code + password. */
export function LoginTabs({ next, initial }: { next?: string; initial?: "student" | "committee" }) {
  const [tab, setTab] = useState<"student" | "committee">(initial ?? "student");
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2" role="group">
        {(["student", "committee"] as const).map((k) => (
          <Button
            key={k}
            type="button"
            variant="tile"
            className="h-11"
            aria-pressed={tab === k}
            onClick={() => setTab(k)}
          >
            {k === "student" ? lo.otp.tabStudent : lo.otp.tabCommittee}
          </Button>
        ))}
      </div>
      {tab === "student" ? <PhoneLogin /> : <LoginForm next={next} />}
    </div>
  );
}
