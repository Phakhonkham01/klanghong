import { Fragment } from "react";
import Link from "next/link";
import { PiggyBank } from "lucide-react";
import { formatDateLo, formatMonthLo } from "@/lib/format";
import { lo } from "@/lib/i18n/lo";
import type { WeekEntry } from "@/lib/status";
import { addDays, isoWeekday, type IsoDate } from "@/lib/week";
import { cn } from "@/lib/utils";
import { FocusCurrentWeek } from "./focus-current-week";
import { PathLinks, type PathLink } from "./path-links";
import { pathNodeStyle, type NodeKind } from "./status-style";

const CURRENT_ID = "current-week";

/** Horizontal offsets (px) that make the column of nodes snake left and right. */
const ZIGZAG = [0, -56, -84, -56, 0, 56, 84, 56];

type PathNode = { weekStart: IsoDate; kind: NodeKind; entry?: WeekEntry };

function Node({ node, offset, decor }: { node: PathNode; offset: number; decor?: boolean }) {
  const { className, icon: Icon } = pathNodeStyle[node.kind];
  const isCurrent = node.entry?.isCurrent ?? false;
  const payable = node.entry?.isPayable ?? false;
  const label = `${formatDateLo(node.weekStart)} · ${
    node.kind === "future" ? lo.dashboard.upcoming : lo.status[node.kind]
  }`;

  const circle = (
    <span
      data-path-node
      className={cn(
        "grid size-[72px] press-3d place-items-center rounded-full [--press-depth:6px]",
        className,
      )}
    >
      <Icon className="size-8" strokeWidth={2.8} aria-hidden />
    </span>
  );

  return (
    <li
      id={isCurrent ? CURRENT_ID : undefined}
      className={cn(
        "relative z-10 flex scroll-mt-48 flex-col items-center",
        isCurrent && payable && "mt-10",
      )}
      style={{ transform: `translateX(${offset}px)` }}
    >
      {decor ? (
        <span
          aria-hidden
          className="pointer-events-none absolute top-1 left-full ml-14 grid size-24 place-items-center rounded-full bg-accent"
        >
          <PiggyBank className="size-14 text-primary" strokeWidth={1.8} />
        </span>
      ) : null}
      {isCurrent && payable ? (
        <span className="absolute -top-11 left-1/2 z-10 animate-bob rounded-xl border-2 border-tile-shade bg-tile px-3 py-1 text-sm font-bold whitespace-nowrap text-primary shadow-sm after:absolute after:top-full after:left-1/2 after:-ml-2 after:border-8 after:border-transparent after:border-t-tile-shade">
          {lo.dashboard.start}
        </span>
      ) : null}
      <span
        className={cn(
          "rounded-full p-1.5",
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
      </span>
      <span
        className={cn(
          "mt-1 text-xs font-semibold text-muted-foreground",
          isCurrent && "font-bold text-foreground",
        )}
      >
        {formatDateLo(node.weekStart, false)}
      </span>
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
  upcoming = 2,
  max = 8,
}: {
  entries: WeekEntry[];
  /** Today in the app timezone: fills the link to next week and sets how far ahead to show. */
  today?: IsoDate;
  upcoming?: number;
  max?: number;
}) {
  const recent = entries.slice(-max);
  const last = recent.at(-1)?.weekStart;
  const future: IsoDate[] = [];
  if (last) {
    const until = today ? endOfNextMonth(today) : null;
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
    ...future.map((weekStart) => ({ weekStart, kind: "future" as const })),
  ];
  // Decorate the left-swinging node closest to (at or before) the current week.
  const currentIndex = recent.length - 1;
  let decorIndex = -1;
  for (let i = currentIndex; i >= 0; i--) {
    if (ZIGZAG[i % ZIGZAG.length]! < -40) {
      decorIndex = i;
      break;
    }
  }

  // Days gone in this week (Mon = 1 … Sun = 7) fill the link from this week to the next.
  const dow = today ? isoWeekday(today) : 0;
  const links: PathLink[] = nodes.slice(1).map((next, i) => {
    if (next.kind !== "future") return { from: i, to: i + 1, kind: "done" };
    if (today && nodes[i]!.entry?.isCurrent) {
      return {
        from: i,
        to: i + 1,
        kind: "current",
        fraction: dow / 7,
      };
    }
    return { from: i, to: i + 1, kind: "future" };
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
            <Node node={node} offset={ZIGZAG[i % ZIGZAG.length]!} decor={i === decorIndex} />
          </Fragment>
        ))}
      </ol>
      <FocusCurrentWeek targetId={CURRENT_ID} />
    </section>
  );
}
