import Link from "next/link";
import { Banknote, ChevronRight, Landmark } from "lucide-react";
import { formatWeekRange } from "@/lib/format";
import { lo } from "@/lib/i18n/lo";
import { formatKip } from "@/lib/money";
import type { IsoDate } from "@/lib/week";
import { cn } from "@/lib/utils";

const t = lo.committee.overview;

/** This week's collection at a glance: who paid, money in vs expected, what is left. */
export function WeekCollectCard({
  week,
  members,
  paid,
  pending,
  collected,
  split,
  expected,
}: {
  week: IsoDate;
  members: number;
  paid: number;
  pending: number;
  /** Approved money for this week. */
  collected: number;
  /** This week's approved money and people, by how they paid. */
  split?: { transfer: number; cash: number; transferPeople: number; cashPeople: number };
  expected: number;
}) {
  const unpaid = Math.max(0, members - paid - pending);
  const share = (n: number) => (members ? (n / members) * 100 : 0);
  const percent = Math.round(share(paid));
  const tiles = [
    {
      label: t.collectedWeek,
      value: formatKip(collected),
      sub: `/ ${formatKip(expected)}`,
      dot: "bg-primary",
    },
    { label: lo.status.pending, value: String(pending), dot: "bg-status-pending" },
    {
      label: t.unpaidLeft,
      value: String(unpaid),
      dot: "bg-muted-foreground/40",
      href: "/committee/members?filter=unpaid",
    },
  ];

  return (
    <section className="rounded-2xl border-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold">{t.thisWeek}</h2>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-muted-foreground">
          {formatWeekRange(week)}
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="money text-2xl leading-none font-black">
          {paid}
          <span className="text-base font-bold text-muted-foreground"> / {members} </span>
          <span className="text-sm font-semibold text-muted-foreground">{t.people}</span>
        </p>
        <span className="rounded-full bg-accent px-2 py-0.5 money text-xs font-black text-accent-foreground">
          {percent}%
        </span>
      </div>

      {/* paid (green) + waiting for review (amber); the track is what is left */}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={members}
        aria-valuenow={paid}
        aria-label={t.paidOf(paid, members)}
        className="relative mt-2.5 flex h-3.5 overflow-hidden rounded-full bg-muted"
      >
        <span className="h-full bg-primary" style={{ width: `${share(paid)}%` }} />
        <span className="h-full bg-status-pending" style={{ width: `${share(pending)}%` }} />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-2 top-0.5 h-1 rounded-full bg-white/35"
        />
      </div>

      {split ? (
        // How this week's money came in: big, easy to read at a glance.
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[
            {
              icon: Landmark,
              label: t.byTransfer,
              amount: split.transfer,
              people: split.transferPeople,
              tone: "bg-sky/10 text-sky",
            },
            {
              icon: Banknote,
              label: t.byCash,
              amount: split.cash,
              people: split.cashPeople,
              tone: "bg-primary/10 text-grass-shade",
            },
          ].map((x) => (
            <div key={x.label} className="min-w-0 rounded-xl border-2 p-2.5">
              <div className="flex items-center gap-2">
                <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", x.tone)}>
                  <x.icon className="size-[18px]" strokeWidth={2.4} aria-hidden />
                </span>
                <span className="min-w-0 leading-tight">
                  <span className="block text-sm font-bold">{x.label}</span>
                  <span className="block money text-[11px] font-semibold text-muted-foreground">
                    {x.people} {t.people}
                  </span>
                </span>
              </div>
              <p className="mt-1.5 money text-xl leading-tight font-black whitespace-nowrap">
                {formatKip(x.amount)}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {tiles.map((x) => {
          const body = (
            <>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                <span className={cn("size-1.5 shrink-0 rounded-full", x.dot)} aria-hidden />
                <span className="truncate">{x.label}</span>
              </span>
              <span className="mt-0.5 money text-sm leading-tight font-black">{x.value}</span>
              {x.sub ? (
                <span className="money text-[10px] font-semibold text-muted-foreground">
                  {x.sub}
                </span>
              ) : null}
            </>
          );
          const cls = "flex min-w-0 flex-col rounded-xl bg-muted/50 px-2.5 py-2";
          return x.href ? (
            <Link key={x.label} href={x.href} className={cn(cls, "relative hover:bg-muted")}>
              {body}
              <ChevronRight
                className="absolute top-1/2 right-1.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
            </Link>
          ) : (
            <div key={x.label} className={cls}>
              {body}
            </div>
          );
        })}
      </div>
    </section>
  );
}
