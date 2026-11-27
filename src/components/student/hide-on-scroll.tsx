"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Sticky bar that slides away while the page scrolls down (finger swipes up) and slides back as
 * soon as it scrolls up again, so it doesn't cover the content being read.
 */
export function HideOnScroll({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [hidden, setHidden] = useState(false);
  const last = useRef(0);

  useEffect(() => {
    last.current = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - last.current;
        // Small jitters don't toggle it; near the top it always shows.
        if (y < 80) setHidden(false);
        else if (delta > 6) setHidden(true);
        else if (delta < -6) setHidden(false);
        if (Math.abs(delta) > 6 || y < 80) last.current = y;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={cn(
        "transition-[translate,opacity] duration-300 ease-out motion-reduce:transition-none",
        hidden && "pointer-events-none -translate-y-[120%] opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
