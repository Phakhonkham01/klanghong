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

/** sign: holds a sign on a stick · point: points at the week button · thumbs: thumbs up. */
type Pose = "sign" | "point" | "thumbs";
type Mood = {
  text: readonly [string, string];
  icon: LucideIcon;
  tone: string;
  pose: Pose;
  href?: string;
};

/** What the mascot's sign says for the current week. */
export function mascotMood(entry: WeekEntry): Mood | null {
  const m = lo.dashboard.mascot;
  const pay = `/pay?week=${entry.weekStart}`;
  switch (entry.status) {
    case "unpaid":
    case "overdue":
      return { text: m.pay, icon: Wallet, tone: "border-sky text-sky", pose: "point", href: pay };
    case "rejected":
      return {
        text: m.resend,
        icon: RotateCcw,
        tone: "border-status-rejected text-status-rejected",
        pose: "point",
        href: pay,
      };
    case "pending":
      return {
        text: m.checking,
        icon: Hourglass,
        tone: "border-status-pending text-status-pending",
        pose: "sign",
      };
    case "paid": {
      const cash = entry.payment?.source === "cash";
      return {
        text: cash ? m.paidCash : m.paidTransfer,
        icon: cash ? Banknote : Landmark,
        tone: "border-primary text-grass-shade",
        pose: "thumbs",
      };
    }
    default:
      return null;
  }
}

const SHADE = "var(--grass-shade)";
const INK = "#1f2937";

/**
 * Original green piggy-bank character (drawn here, no external art). Faces right, towards the
 * week button. Poses: holding a sign stick, pointing a hoof at the button, or a thumbs up.
 */
function Piggy({ pose, happy }: { pose: Pose; happy: boolean }) {
  return (
    <svg viewBox="0 -8 86 68" className="h-[64px] w-[82px]" aria-hidden>
      {/* legs */}
      <rect x="20" y="46" width="8" height="10" rx="3" fill={SHADE} />
      <rect x="40" y="46" width="8" height="10" rx="3" fill={SHADE} />
      {/* tail */}
      <path
        d="M9 32 q-6 -2 -4 -7 q3 -4 6 0"
        fill="none"
        stroke={SHADE}
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* body */}
      <ellipse cx="34" cy="34" rx="24" ry="17" fill="var(--grass)" />
      <ellipse cx="34" cy="38" rx="24" ry="13" fill={SHADE} opacity="0.35" />
      {/* coin slot */}
      <rect x="27" y="18.5" width="12" height="3" rx="1.5" fill={SHADE} />
      {/* ears */}
      <path d="M40 20 l5 -10 l6 11 z" fill={SHADE} />
      <path d="M48 21 l6 -9 l4 12 z" fill="var(--grass)" />

      {pose === "sign" ? (
        // raised arm holding the sign stick
        <path
          d="M26 28 q-4 -10 2 -20"
          fill="none"
          stroke={SHADE}
          strokeWidth="5"
          strokeLinecap="round"
        />
      ) : null}

      {/* eye */}
      {happy ? (
        <path
          d="M47 27 q3 -4 6 0"
          fill="none"
          stroke={INK}
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      ) : (
        <>
          <circle cx="50" cy="27" r="3.2" fill={INK} />
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
        stroke={SHADE}
        strokeWidth="1.5"
      />
      <circle cx="58" cy="33" r="1.3" fill={SHADE} />
      <circle cx="62" cy="33" r="1.3" fill={SHADE} />
      {/* mouth: open "look here!" when pointing, smile otherwise */}
      {pose === "point" ? (
        <ellipse cx="53" cy="40.5" rx="2.6" ry="2" fill={INK} />
      ) : (
        <path
          d="M50 39 q3 3 6 0"
          fill="none"
          stroke={INK}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      )}

      {pose === "thumbs" ? (
        // front arm up beside the face with a big thumbs-up hoof, wiggling
        <g className="animate-thumb">
          <path
            d="M44 45 q22 2 26 -17"
            fill="none"
            stroke={SHADE}
            strokeWidth="5"
            strokeLinecap="round"
          />
          <rect x="63" y="15" width="14" height="13" rx="4.5" fill={SHADE} />
          <rect x="63.5" y="1" width="6" height="17" rx="3" fill={SHADE} />
          <path
            d="M70 19 h6 M70 22.5 h6 M70 26 h5"
            stroke="color-mix(in oklch, var(--grass), white 35%)"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </g>
      ) : null}

      {pose === "point" ? (
        // front arm stretched towards the button, finger out, poking back and forth
        <g className="animate-poke">
          <path
            d="M42 43 q14 2 28 -1"
            fill="none"
            stroke={SHADE}
            strokeWidth="5"
            strokeLinecap="round"
          />
          <circle cx="71" cy="42" r="4.5" fill={SHADE} />
          <rect x="72" y="39.5" width="12" height="4.5" rx="2.25" fill={SHADE} />
        </g>
      ) : null}
    </svg>
  );
}

/**
 * The piggy stands beside the current week and tells its state: it points at the button when the
 * student must pay (or resend), holds a sign while the slip is checked, and gives a thumbs up
 * once paid. It always faces the node.
 * `side` is where it stands relative to the node.
 */
export function PiggyMascot({ entry, side }: { entry: WeekEntry; side: "left" | "right" }) {
  const mood = mascotMood(entry);
  if (!mood) return null;
  const Icon = mood.icon;
  const sign = (
    <span
      className={cn(
        "flex w-max items-center gap-1.5 rounded-xl border-2 bg-background px-2 py-1 whitespace-nowrap shadow-sm",
        mood.pose === "sign" && "animate-sway",
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
      {mood.pose === "sign" ? (
        // sign stick
        <span className="h-3 w-1 rounded-full bg-grass-shade" aria-hidden />
      ) : (
        // speech-bubble tail
        <svg
          aria-hidden
          viewBox="0 0 14 8"
          className={cn("-mt-0.5 h-2 w-3.5", mood.tone)}
          fill="currentColor"
        >
          <path d="M0 0 H14 L7 8 Z" />
        </svg>
      )}
      <span className={cn("-mt-1 block animate-hop", side === "right" && "-scale-x-100")}>
        <Piggy pose={mood.pose} happy={entry.status === "paid"} />
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
