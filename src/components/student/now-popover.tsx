"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { lo } from "@/lib/i18n/lo";
import { APP_TIMEZONE } from "@/lib/week";
import { cn } from "@/lib/utils";

const parts = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIMEZONE,
  weekday: "short",
  day: "numeric",
  month: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});
const WEEKDAY: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

/** e.g. `ເສົາ 28 ພະຈິກ 2026` and `14:05:32`, in Lao time whatever the phone's timezone. */
function formatNow(d: Date): { date: string; time: string } {
  const p = Object.fromEntries(parts.formatToParts(d).map((x) => [x.type, x.value]));
  const weekday = lo.date.weekdaysShort[WEEKDAY[p.weekday!] ?? 0];
  const month = lo.date.months[Number(p.month) - 1];
  return {
    date: `${weekday} ${p.day} ${month} ${p.year}`,
    time: `${p.hour}:${p.minute}:${p.second}`,
  };
}

/**
 * Small bubble pointing at the "today" dot on the week path, with a live clock (to the second).
 * Placed on the side with more room, and kept inside the path's width.
 */
export function NowPopover({ x, y, width }: { x: number; y: number; width: number }) {
  const [now, setNow] = useState<Date | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(150);

  // Clock starts after mount, so server and browser render the same markup.
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  useLayoutEffect(() => {
    if (box.current) setW(box.current.offsetWidth);
  }, [now]);

  if (!now) return null;
  const { date, time } = formatNow(now);
  const gap = 16;
  const left = x > width / 2; // bubble sits left of the dot when the dot is on the right half
  const raw = left ? x - gap - w : x + gap;
  const pos = Math.max(0, Math.min(raw, width - w));

  return (
    <div
      ref={box}
      role="status"
      aria-label={`${lo.dashboard.now}: ${date} ${time}`}
      className="pointer-events-none absolute z-20 -translate-y-1/2 rounded-xl border-2 border-primary bg-background px-2.5 py-1.5 shadow-md"
      style={{ left: pos, top: y }}
    >
      {/* arrow pointing at the dot */}
      <span
        aria-hidden
        className={cn(
          "absolute top-1/2 size-3 -translate-y-1/2 rotate-45 border-primary bg-background",
          left ? "-right-[7px] border-t-2 border-r-2" : "-left-[7px] border-b-2 border-l-2",
        )}
      />
      <p className="text-[11px] leading-tight font-semibold whitespace-nowrap text-muted-foreground">
        {lo.dashboard.now} · {date}
      </p>
      <p className="money text-base leading-tight font-black whitespace-nowrap text-grass-shade tabular-nums">
        {time}
      </p>
    </div>
  );
}
