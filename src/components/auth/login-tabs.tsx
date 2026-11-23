"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { lo } from "@/lib/i18n/lo";
import { LoginForm } from "./login-form";
import { PhoneLogin } from "./phone-login";
import { REVEAL_COMMITTEE_EVENT } from "./secret-logo";

/**
 * Students: phone + OTP (the only visible option).
 * Committee: code + password, shown only after tapping the logo three times.
 */
export function LoginTabs({ next }: { next?: string }) {
  const [committee, setCommittee] = useState(false);

  useEffect(() => {
    const reveal = () => setCommittee(true);
    window.addEventListener(REVEAL_COMMITTEE_EVENT, reveal);
    return () => window.removeEventListener(REVEAL_COMMITTEE_EVENT, reveal);
  }, []);

  if (!committee) return <PhoneLogin />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-bold">{lo.otp.tabCommittee}</p>
        <button
          type="button"
          onClick={() => setCommittee(false)}
          className="flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> {lo.otp.tabStudent}
        </button>
      </div>
      <LoginForm next={next} />
    </div>
  );
}
