"use client";

import { useEffect } from "react";

/** On load, bring the current week (and the day track under it) into view if it is off-screen. */
export function FocusCurrentWeek({ targetId }: { targetId: string }) {
  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    const r = el.getBoundingClientRect();
    // Leave room for the bottom tab bar on phones.
    if (r.top < 0 || r.bottom > window.innerHeight - 96) {
      el.scrollIntoView({ block: "center", behavior: "instant" });
    }
  }, [targetId]);
  return null;
}
