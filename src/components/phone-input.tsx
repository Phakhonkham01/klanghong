"use client";

import { useState } from "react";
import { Smartphone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { lo } from "@/lib/i18n/lo";
import { formatLocalDigits, localPhoneDigits } from "@/lib/phone";
import { cn } from "@/lib/utils";

/**
 * Lao mobile number with a fixed "020" prefix: the user types only the 8 digits after it.
 * Pasting a full number (020…, +856 20…, 20…) also works.
 * With `name`, a hidden input submits the full number "020XXXXXXXX" in forms.
 */
export function PhoneInput({
  name,
  defaultValue,
  onValueChange,
  autoComplete = "tel",
  autoFocus,
  className,
}: {
  name?: string;
  /** Any format; reduced to the local 8 digits. */
  defaultValue?: string;
  /** Called with the full number "020XXXXXXXX" (or "" when empty). */
  onValueChange?: (full: string) => void;
  autoComplete?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  const [digits, setDigits] = useState(() => localPhoneDigits(defaultValue ?? ""));
  const full = digits ? `020${digits}` : "";
  const update = (next: string) => {
    setDigits(next);
    onValueChange?.(next ? `020${next}` : "");
  };

  return (
    <div className="relative">
      <Smartphone
        className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute top-1/2 left-11 -translate-y-1/2 money text-base font-bold text-foreground"
        aria-hidden
      >
        020
      </span>
      <Input
        value={formatLocalDigits(digits)}
        onChange={(e) => update(localPhoneDigits(e.target.value))}
        onPaste={(e) => {
          // maxLength would cut a pasted full number ("020 5555 1234") before onChange sees it.
          e.preventDefault();
          update(localPhoneDigits(e.clipboardData.getData("text")));
        }}
        placeholder="xxxx xxxx"
        aria-label={`${lo.otp.phone} (020)`}
        inputMode="numeric"
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        maxLength={9}
        className={cn(
          "h-13 rounded-2xl border-2 bg-muted/40 pr-4 pl-[4.75rem] money text-base tracking-wide md:text-base",
          className,
        )}
      />
      {name ? <input type="hidden" name={name} value={full} /> : null}
    </div>
  );
}
