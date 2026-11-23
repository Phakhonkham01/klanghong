"use client";

import { useRef } from "react";
import { PiggyBank } from "lucide-react";

export const REVEAL_COMMITTEE_EVENT = "klanghong:reveal-committee";
const TAPS = 3;
const WINDOW_MS = 800; // max gap between taps

/** The splash logo. Three quick taps reveal the hidden committee sign-in. */
export function SecretLogo() {
  const taps = useRef<number[]>([]);
  return (
    <span
      onClick={() => {
        const now = Date.now();
        const recent = taps.current.filter((t) => now - t < WINDOW_MS * TAPS);
        const last = recent.at(-1);
        taps.current = last !== undefined && now - last > WINDOW_MS ? [now] : [...recent, now];
        if (taps.current.length >= TAPS) {
          taps.current = [];
          window.dispatchEvent(new Event(REVEAL_COMMITTEE_EVENT));
        }
      }}
      className="grid size-28 cursor-default place-items-center rounded-[2rem] bg-white/95 text-primary shadow-[0_8px_0_0_var(--brand-shade)] select-none [-webkit-tap-highlight-color:transparent] active:translate-y-0.5"
    >
      <PiggyBank className="size-16" strokeWidth={2.2} aria-hidden />
    </span>
  );
}
