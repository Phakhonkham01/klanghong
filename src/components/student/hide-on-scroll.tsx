"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Always shown this close to the top of the page (px). */
const TOP = 80;
/** Scroll back up this far before the bar returns (px; ~1.5 cm on a phone). */
const SHOW_AFTER = 60;

/**
 * Sticky bar that slides away while the page scrolls down (finger swipes up) and slides back
 * once it has scrolled up again by about 1.5 cm, so small moves don't make it flicker.
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
    // Lowest point reached while hidden: the bar returns only after scrolling back up
    // SHOW_AFTER px from there (about 1.5 cm on a phone), not at the first small move.
    let turn = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - last.current;
        if (y < TOP) {
          setHidden(false); // near the top it always shows
        } else if (delta > 6) {
          setHidden(true);
          turn = y;
        } else if (y > turn) {
          turn = y; // still going down (small steps): keep the lowest point
        } else if (turn - y >= SHOW_AFTER) {
          setHidden(false);
        }
        last.current = y;
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
