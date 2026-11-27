import type { DecorationKind } from "@/lib/themes";
import { cn } from "@/lib/utils";

/** One festival shape as inline SVG (original drawings, no external art). Decorative only. */
export function FestivalArt({
  kind,
  variant = 0,
  className,
}: {
  kind: DecorationKind;
  /** 1 = the festival's second shape (water drop, snowflake, small candle) where it has one. */
  variant?: 0 | 1;
  className?: string;
}) {
  const props = {
    viewBox: "0 0 48 48",
    className: cn("block", className),
    "aria-hidden": true as const,
  };

  if (kind === "fireworks") {
    return (
      <svg {...props} fill="none" stroke="#F5D77A" strokeWidth={2.4} strokeLinecap="round">
        <circle cx="24" cy="24" r="3" fill="#FFFFFF" stroke="none" />
        <path d="M24 4v8M24 36v8M4 24h8M36 24h8M10 10l6 6M32 32l6 6M38 10l-6 6M16 32l-6 6" />
        <circle cx="24" cy="6" r="1.6" fill="#FFFFFF" stroke="none" />
        <circle cx="42" cy="24" r="1.6" fill="#FFFFFF" stroke="none" />
      </svg>
    );
  }
  if (kind === "hearts") {
    return (
      <svg {...props}>
        <path
          d="M24 41C10 31 4 23 4 15a9 9 0 0 1 20-4 9 9 0 0 1 20 4c0 8-6 16-20 26z"
          fill="#FF5C8A"
        />
        <path
          d="M14 13a5 5 0 0 1 6-1"
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity={0.6}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (kind === "champa") {
    if (variant === 1) {
      return (
        <svg {...props}>
          <path d="M24 4S10 22 10 31a14 14 0 0 0 28 0C38 22 24 4 24 4z" fill="#BDE6FB" />
          <path
            d="M17 31a7 7 0 0 0 5 7"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        </svg>
      );
    }
    return (
      <svg {...props}>
        <g fill="#FFFFFF" stroke="#F2B705" strokeWidth={1.4}>
          {[0, 72, 144, 216, 288].map((r) => (
            <ellipse key={r} cx="24" cy="12" rx="6" ry="10" transform={`rotate(${r} 24 24)`} />
          ))}
        </g>
        <circle cx="24" cy="24" r="5" fill="#FFC83D" />
      </svg>
    );
  }
  if (kind === "candle") {
    return (
      <svg {...props}>
        <path d="M24 4c4 6 6 9 6 12a6 6 0 0 1-12 0c0-3 2-6 6-12z" fill="#FFB020" />
        <path d="M24 10c2 3 3 5 3 6.5a3 3 0 0 1-6 0c0-1.5 1-3.5 3-6.5z" fill="#FFF3B0" />
        <rect x="18" y="22" width="12" height="22" rx="2" fill={variant ? "#FFF4D0" : "#F7E7B0"} />
        <rect x="15" y="42" width="18" height="4" rx="2" fill="#C99700" />
      </svg>
    );
  }
  if (kind === "boat") {
    return (
      <svg {...props}>
        <path d="M4 30h40l-6 9H10z" fill="#FF8A1F" />
        <path d="M14 30V18h20v12" fill="none" stroke="#FFC94D" strokeWidth={2.4} />
        <path d="M24 6c3 4 4 6 4 8a4 4 0 0 1-8 0c0-2 1-4 4-8z" fill="#FFB020" />
        <circle cx="16" cy="24" r="2" fill="#FFD45E" />
        <circle cx="24" cy="24" r="2" fill="#FFD45E" />
        <circle cx="32" cy="24" r="2" fill="#FFD45E" />
        <path
          d="M6 44c4-2 8 2 12 0s8 2 12 0 8 2 12 0"
          fill="none"
          stroke="#FFC94D"
          strokeOpacity={0.6}
          strokeWidth={2}
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (kind === "pumpkin") {
    return (
      <svg {...props}>
        <path
          d="M24 12c0-4 2-6 5-7"
          fill="none"
          stroke="#3F7D2C"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <ellipse cx="16" cy="29" rx="11" ry="14" fill="#E8650A" />
        <ellipse cx="32" cy="29" rx="11" ry="14" fill="#E8650A" />
        <ellipse cx="24" cy="29" rx="10" ry="15" fill="#FF8A2A" />
        <path
          d="M18 26l3 3-3 1zM30 26l-3 3 3 1zM18 35c4 3 8 3 12 0"
          fill="#2A1404"
          stroke="#2A1404"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === "stupa") {
    return (
      <svg {...props}>
        <path d="M24 2c1 6 2 10 2 14h-4c0-4 1-8 2-14z" fill="#D4A017" />
        <path d="M17 16h14l3 8H14z" fill="#D4A017" />
        <path d="M12 24h24l-2 8H14z" fill="#F2C94C" />
        <path d="M8 32h32v6H8z" fill="#D4A017" />
        <path d="M5 38h38v6H5z" fill="#F2C94C" />
      </svg>
    );
  }
  // xmas
  if (variant === 1) {
    return (
      // light blue so the snowflake also shows on the light Christmas page
      <svg {...props} fill="none" stroke="#8EC3E6" strokeWidth={2.6} strokeLinecap="round">
        <path d="M24 6v36M8.4 15l31.2 18M8.4 33l31.2-18M20 9l4 4 4-4M20 39l4-4 4 4" />
      </svg>
    );
  }
  return (
    <svg {...props}>
      <path d="M24 6l9 12h-5l8 10h-5l8 10H9l8-10h-5l8-10h-5z" fill="#2E9E5B" />
      <rect x="21" y="38" width="6" height="7" rx="1" fill="#7A4A21" />
      <path
        d="M24 1l1.6 3.4 3.7.4-2.8 2.5.8 3.6L24 9l-3.3 1.9.8-3.6-2.8-2.5 3.7-.4z"
        fill="#FFC93C"
      />
      <circle cx="19" cy="24" r="1.8" fill="#D62828" />
      <circle cx="29" cy="30" r="1.8" fill="#D62828" />
      <circle cx="22" cy="34" r="1.8" fill="#FFC93C" />
    </svg>
  );
}

/** Festivals whose second shape differs from the first (drops, snow, small candles). */
const HAS_ALT: DecorationKind[] = ["champa", "xmas", "candle"];

/**
 * Faint decorations scattered behind the page content (fixed to the screen, never clickable).
 * The parent must create a stacking context (`isolate`) so they sit above its background only.
 */
export function FestivalDecor({ kind, dense }: { kind: DecorationKind; dense: boolean }) {
  const alt = (i: number): 0 | 1 => (HAS_ALT.includes(kind) && i % 2 === 1 ? 1 : 0);
  const spots = dense
    ? [
        "right-3 top-[38%] size-14 rotate-12 opacity-30",
        "left-2 top-[52%] size-11 -rotate-12 opacity-25",
        "right-6 top-[64%] size-10 rotate-6 opacity-25",
        "left-5 top-[76%] size-12 -rotate-6 opacity-30",
        "right-2 bottom-24 size-9 rotate-12 opacity-20",
        "left-1/3 top-[88%] size-7 opacity-20",
      ]
    : [
        "right-3 top-[56%] size-10 rotate-12 opacity-20",
        "left-3 top-[72%] size-9 -rotate-6 opacity-15",
        "right-5 bottom-28 size-8 rotate-6 opacity-15",
      ];
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {spots.map((c, i) => (
        <span key={c} className={cn("absolute", c)}>
          <FestivalArt kind={kind} variant={alt(i)} className="size-full" />
        </span>
      ))}
    </div>
  );
}
