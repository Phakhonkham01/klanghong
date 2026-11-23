"use client";

import { useEffect, useState } from "react";
import { Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { lo } from "@/lib/i18n/lo";
import { cn } from "@/lib/utils";

/** Settings row with a chunky switch that toggles dark mode. */
export function DarkModeRow({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className={className}
    >
      <Moon className="size-5 text-streak" strokeWidth={2.6} aria-hidden />
      <span className="flex-1">{lo.profile.darkMode}</span>
      <span
        aria-hidden
        className={cn(
          "relative h-7 w-12 rounded-full transition-colors",
          dark ? "bg-primary" : "bg-muted-foreground/30",
        )}
      >
        <span
          className={cn(
            "absolute top-1 left-1 size-5 rounded-full bg-white shadow-[0_2px_0_0_rgb(0_0_0/0.15)] transition-transform",
            dark && "translate-x-5",
          )}
        />
      </span>
    </button>
  );
}
