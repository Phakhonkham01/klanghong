import { Fragment } from "react";
import Link from "next/link";
import { formatDateLo, formatMonthLo } from "@/lib/format";
import { lo } from "@/lib/i18n/lo";
import type { WeekEntry } from "@/lib/status";
import { addDays, isoWeekday, type IsoDate } from "@/lib/week";
import { cn } from "@/lib/utils";
import { FocusCurrentWeek } from "./focus-current-week";
import { PathLinks, type PathLink } from "./path-links";
import { PiggyMascot } from "./piggy-mascot";
import { pathNodeStyle, type NodeKind } from "./status-style";

const CURRENT_ID = "current-week";

/** Horizontal offsets (px) that make the column of nodes snake left and right. */
const ZIGZAG = [0, -56, -84, -56, 0, 56, 84, 56];

type PathNode = {
  weekStart: IsoDate;
  kind: NodeKind;
  entry?: WeekEntry;
  /** The next week to pay ahead (gently pulses). */
  nextUp?: boolean;
};

function Node({ node, offset }: { node: PathNode; offset: number }) {
  const { className, icon: Icon } = pathNodeStyle[node.kind];
  const isCurrent = node.entry?.isCurrent ?? false;
  // Owed weeks, and upcoming weeks open for paying ahead, open the pay page.
  const payable = (node.entry?.isPayable ?? false) || node.kind === "ahead";
  const label = `${formatDateLo(node.weekStart)} · ${
    node.kind === "future"
      ? lo.dashboard.upcoming
      : node.kind === "ahead"
        ? lo.dashboard.payAheadNode
        : lo.status[node.kind]
  }`;

  const circle = (
    <span
      data-path-node
      className={cn(
        "grid size-[72px] press-3d place-items-center rounded-full [--press-depth:6px]",
        className,
        node.nextUp && "animate-pulse",
      )}
    >
      <Icon className="size-8" strokeWidth={2.8} aria-hidden />
    </span>
  );

  return (
    <li
      id={isCurrent ? CURRENT_ID : undefined}
      className={cn("relative z-10 flex scroll-mt-48 flex-col items-center")}
      style={{ transform: `translateX(${offset}px)` }}
    >
      <span
        className={cn(
          "relative rounded-full p-1.5",
          isCurrent && "ring-[6px] ring-primary/25 ring-inset",
          isCurrent && node.kind !== "unpaid" && "ring-sky/30",
        )}
      >
        {payable ? (
          <Link
            href={`/pay?week=${node.weekStart}`}
            aria-label={label}
            className="block rounded-full outline-none focus-visible:ring-4 focus-visible:ring-ring/50"
          >
            {circle}
          </Link>
        ) : (
          <span role="img" aria-label={label} className="block">
            {circle}
          </span>
        )}
        {isCurrent && node.entry ? (
          <PiggyMascot entry={node.entry} side={offset < 0 ? "right" : "left"} />
        ) : null}
      </span>
      <span
        className={cn(
          "mt-1 text-xs font-semibold text-muted-foreground",
          isCurrent && "font-bold text-foreground",
        )}
      >
        {formatDateLo(node.weekStart, false)}
      </span>
      {node.kind === "ahead" && node.nextUp ? (
        <span className="mt-0.5 rounded-full bg-sky px-2 py-0.5 text-[10px] font-bold text-white">
          {lo.dashboard.payAheadNode}
        </span>
      ) : null}
    </li>
  );
}

/** Last day of the month after the one `today` is in, e.g. 2026-11-25 → 2026-12-31. */
function endOfNextMonth(today: IsoDate): IsoDate {
  const [y, m] = today.split("-").map(Number) as [number, number];
  // Day 0 of the month after next = last day of next month (UTC, no timezone drift).
  const d = new Date(Date.UTC(y, m + 1, 0));
  return d.toISOString().slice(0, 10);
}

const monthOf = (iso: IsoDate) => iso.slice(0, 7);

/** Full-width divider with the month name, placed before the first week of each month. */
function MonthDivider({ weekStart }: { weekStart: IsoDate }) {
  return (
    <li aria-hidden className="relative z-10 flex w-full items-center gap-3 py-1">
      <span className="h-0.5 flex-1 rounded-full bg-border" />
      <span className="rounded-full border-2 bg-background px-3 py-0.5 text-sm font-bold text-muted-foreground">
        {formatMonthLo(weekStart)}
      </span>
      <span className="h-0.5 flex-1 rounded-full bg-border" />
    </li>
  );
}

/**
 * Snake-like path of weeks: recent weeks, the current one highlighted, then the locked weeks up
 * to the end of next month (or `upcoming` weeks when `today` is not given), split by month.
 */
export function WeekPath({
  entries,
  today,
  ahead = {},
  payAhead = [],
  upcoming = 2,
  max = 8,
}: {
  entries: WeekEntry[];
  /** Today in the app timezone: fills the link to next week and sets how far ahead to show. */
  today?: IsoDate;
  /** Upcoming weeks already paid ahead (approved) or waiting for review. */
  ahead?: Partial<Record<IsoDate, "paid" | "pending">>;
  /** Upcoming weeks still open to pay, in order; only the first one is unlocked on the path. */
  payAhead?: IsoDate[];
  upcoming?: number;
  max?: number;
}) {
  const recent = entries.slice(-max);
  const last = recent.at(-1)?.weekStart;
  const future: IsoDate[] = [];
  if (last) {
    // Through next month, and at least as far as the last week paid ahead.
    const lastAhead = Object.keys(ahead).sort().at(-1);
    const nextMonthEnd = today ? endOfNextMonth(today) : null;
    const until = nextMonthEnd && lastAhead && lastAhead > nextMonthEnd ? lastAhead : nextMonthEnd;
    for (
      let w = addDays(last, 7);
      until ? w <= until : future.length < upcoming;
      w = addDays(w, 7)
    ) {
      future.push(w);
    }
  }
  const nodes: PathNode[] = [
    ...recent.map((entry) => ({ weekStart: entry.weekStart, kind: entry.status, entry })),
    ...future.map((weekStart): PathNode => {
      const paid = ahead[weekStart];
      if (paid) return { weekStart, kind: paid };
      // Weeks unlock one at a time, in order: only the week right after the last paid one opens,
      // and only once nothing older is still owed. The rest stay locked until it is paid.
      if (weekStart === payAhead[0] && !recent.some((e) => e.isPayable)) {
        return { weekStart, kind: "ahead", nextUp: true };
      }
      return { weekStart, kind: "future" };
    }),
  ];
  // Days gone in this week (Mon = 1 … Sun = 7) fill the link from this week to the next.
  const dow = today ? isoWeekday(today) : 0;
  const links: PathLink[] = nodes.slice(1).map((next, i) => {
    if (today && nodes[i]!.entry?.isCurrent) {
      return {
        from: i,
        to: i + 1,
        kind: "current",
        fraction: dow / 7,
      };
    }
    return {
      from: i,
      to: i + 1,
      kind: next.kind === "future" || next.kind === "ahead" ? "future" : "done",
    };
  });

  return (
    <section aria-label={lo.dashboard.path} className="relative overflow-x-clip pt-2 pb-4">
      <PathLinks links={links} />
      <ol className="flex flex-col items-center gap-7">
        {nodes.map((node, i) => (
          <Fragment key={node.weekStart}>
            {i === 0 || monthOf(node.weekStart) !== monthOf(nodes[i - 1]!.weekStart) ? (
              <MonthDivider weekStart={node.weekStart} />
            ) : null}
            <Node node={node} offset={ZIGZAG[i % ZIGZAG.length]!} />
          </Fragment>
        ))}
      </ol>
      <FocusCurrentWeek targetId={CURRENT_ID} />
    </section>
  );
}
