import Link from "next/link";
import {
  Banknote,
  Check,
  Hourglass,
  Landmark,
  RotateCcw,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { lo } from "@/lib/i18n/lo";
import type { WeekEntry } from "@/lib/status";
import { cn } from "@/lib/utils";

type Mood = { text: readonly [string, string]; icon: LucideIcon; tone: string; href?: string };

/** What the mascot's sign says for the current week. */
export function mascotMood(entry: WeekEntry): Mood | null {
  const m = lo.dashboard.mascot;
  const pay = `/pay?week=${entry.weekStart}`;
  switch (entry.status) {
    case "unpaid":
    case "overdue":
      return { text: m.pay, icon: Wallet, tone: "border-sky text-sky", href: pay };
    case "rejected":
      return {
        text: m.resend,
        icon: RotateCcw,
        tone: "border-status-rejected text-status-rejected",
        href: pay,
      };
    case "pending":
      return {
        text: m.checking,
        icon: Hourglass,
        tone: "border-status-pending text-status-pending",
      };
    case "paid": {
      const cash = entry.payment?.source === "cash";
      return {
        text: cash ? m.paidCash : m.paidTransfer,
        icon: cash ? Banknote : Landmark,
        tone: "border-primary text-grass-shade",
      };
    }
    default:
      return null;
  }
}

/** Original green piggy-bank character (drawn here, no external art). Faces right. */
function Piggy({ happy }: { happy: boolean }) {
  return (
    <svg viewBox="0 0 72 60" className="h-14 w-[68px]" aria-hidden>
      {/* legs */}
      <rect x="20" y="46" width="8" height="10" rx="3" fill="var(--grass-shade)" />
      <rect x="40" y="46" width="8" height="10" rx="3" fill="var(--grass-shade)" />
      {/* tail */}
      <path
        d="M9 32 q-6 -2 -4 -7 q3 -4 6 0"
        fill="none"
        stroke="var(--grass-shade)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* body */}
      <ellipse cx="34" cy="34" rx="24" ry="17" fill="var(--grass)" />
      <ellipse cx="34" cy="38" rx="24" ry="13" fill="var(--grass-shade)" opacity="0.35" />
      {/* coin slot */}
      <rect x="27" y="18.5" width="12" height="3" rx="1.5" fill="var(--grass-shade)" />
      {/* ears */}
      <path d="M40 20 l5 -10 l6 11 z" fill="var(--grass-shade)" />
      <path d="M48 21 l6 -9 l4 12 z" fill="var(--grass)" />
      {/* raised arm holding the sign handle */}
      <path
        d="M26 28 q-4 -10 2 -20"
        fill="none"
        stroke="var(--grass-shade)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* eye */}
      {happy ? (
        <path
          d="M47 27 q3 -4 6 0"
          fill="none"
          stroke="#1f2937"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      ) : (
        <>
          <circle cx="50" cy="27" r="3.2" fill="#1f2937" />
          <circle cx="51.2" cy="25.8" r="1.1" fill="#fff" />
        </>
      )}
      {/* cheek */}
      <circle cx="47" cy="34" r="3" fill="#ff8fa3" opacity="0.6" />
      {/* snout */}
      <ellipse
        cx="60"
        cy="33"
        rx="7"
        ry="6"
        fill="color-mix(in oklch, var(--grass), white 35%)"
        stroke="var(--grass-shade)"
        strokeWidth="1.5"
      />
      <circle cx="58" cy="33" r="1.3" fill="var(--grass-shade)" />
      <circle cx="62" cy="33" r="1.3" fill="var(--grass-shade)" />
      {/* smile */}
      <path
        d="M50 39 q3 3 6 0"
        fill="none"
        stroke="#1f2937"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * The piggy stands beside the current week holding a sign with its state; it faces the node.
 * `side` is where it stands relative to the node.
 */
export function PiggyMascot({ entry, side }: { entry: WeekEntry; side: "left" | "right" }) {
  const mood = mascotMood(entry);
  if (!mood) return null;
  const Icon = mood.icon;
  const sign = (
    <span
      className={cn(
        "flex w-max animate-sway items-center gap-1.5 rounded-xl border-2 bg-background px-2 py-1 whitespace-nowrap shadow-sm",
        mood.tone,
      )}
    >
      <Icon className="size-4 shrink-0" strokeWidth={2.8} aria-hidden />
      <span className="flex flex-col leading-tight">
        <span className="text-xs font-bold">{mood.text[0]}</span>
        <span className="text-[10px] font-semibold text-muted-foreground">{mood.text[1]}</span>
      </span>
      {entry.status === "paid" ? (
        <Check className="size-3.5 shrink-0" strokeWidth={3} aria-hidden />
      ) : null}
    </span>
  );

  const body = (
    <span className="flex flex-col items-center">
      {sign}
      {/* sign handle */}
      <span className="h-3 w-1 rounded-full bg-grass-shade" aria-hidden />
      <span className={cn("-mt-1 block animate-hop", side === "right" && "-scale-x-100")}>
        <Piggy happy={entry.status === "paid"} />
      </span>
    </span>
  );

  return (
    <span
      className={cn(
        "absolute bottom-0 z-20",
        side === "right" ? "left-full ml-2" : "right-full mr-2",
      )}
    >
      {mood.href ? (
        <Link
          href={mood.href}
          className="block rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-ring/50"
        >
          {body}
        </Link>
      ) : (
        <span role="status">{body}</span>
      )}
    </span>
  );
}
