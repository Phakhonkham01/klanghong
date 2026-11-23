import Link from "next/link";
import { PiggyBank } from "lucide-react";
import { formatDateLo } from "@/lib/format";
import { lo } from "@/lib/i18n/lo";
import type { WeekEntry } from "@/lib/status";
import { addDays, type IsoDate } from "@/lib/week";
import { cn } from "@/lib/utils";
import { nodeStyle, type NodeKind } from "./status-style";

/** Horizontal offsets (px) that make the column of nodes snake left and right. */
const ZIGZAG = [0, -56, -84, -56, 0, 56, 84, 56];

type PathNode = { weekStart: IsoDate; kind: NodeKind; entry?: WeekEntry };

function Node({ node, offset, decor }: { node: PathNode; offset: number; decor?: boolean }) {
  const { className, icon: Icon } = nodeStyle[node.kind];
  const isCurrent = node.entry?.isCurrent ?? false;
  const payable = node.entry?.isPayable ?? false;
  const label = `${formatDateLo(node.weekStart)} · ${
    node.kind === "future" ? lo.dashboard.upcoming : lo.status[node.kind]
  }`;

  const circle = (
    <span
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
      className={cn("relative flex flex-col items-center", isCurrent && payable && "mt-10")}
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

/**
 * Snake-like path of weeks: recent weeks, the current one highlighted,
 * then a couple of locked upcoming weeks.
 */
export function WeekPath({
  entries,
  upcoming = 2,
  max = 8,
}: {
  entries: WeekEntry[];
  upcoming?: number;
  max?: number;
}) {
  const recent = entries.slice(-max);
  const last = recent.at(-1)?.weekStart;
  const nodes: PathNode[] = [
    ...recent.map((entry) => ({ weekStart: entry.weekStart, kind: entry.status, entry })),
    ...(last
      ? Array.from({ length: upcoming }, (_, i) => ({
          weekStart: addDays(last, 7 * (i + 1)),
          kind: "future" as const,
        }))
      : []),
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

  return (
    <section aria-label={lo.dashboard.path} className="relative overflow-x-clip pt-2 pb-4">
      <ol className="flex flex-col items-center gap-5">
        {nodes.map((node, i) => (
          <Node
            key={node.weekStart}
            node={node}
            offset={ZIGZAG[i % ZIGZAG.length]!}
            decor={i === decorIndex}
          />
        ))}
      </ol>
    </section>
  );
}
