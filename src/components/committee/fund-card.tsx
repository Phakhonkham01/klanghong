import Link from "next/link";
import { Banknote, Coins, Hourglass, Landmark, Receipt } from "lucide-react";
import { lo } from "@/lib/i18n/lo";
import { formatKip } from "@/lib/money";
import { cn } from "@/lib/utils";

/** One card for the fund: balance on top, collected / spent / slips waiting below. */
export function FundCard({
  balance,
  collected,
  split,
  spent,
  pending,
}: {
  balance: number;
  collected: number;
  /** Collected money by how it came in. */
  split?: { transfer: number; cash: number };
  spent: number;
  pending: number;
}) {
  return (
    <section className="relative press-3d overflow-hidden rounded-2xl bg-linear-to-br from-sky via-sky to-sky-shade text-white [--press-shade:var(--sky-shade)] active:transform-none">
      <span
        aria-hidden
        className="pointer-events-none absolute -top-10 -right-8 size-32 rounded-full bg-white/10"
      />
      <div className="relative px-5 pt-4 pb-3">
        <p className="text-sm font-bold text-white/85">{lo.committee.overview.balance}</p>
        <p className="mt-0.5 money text-4xl font-black">{formatKip(balance)}</p>
      </div>
      <div className="relative mx-2 mb-2 grid grid-cols-1 gap-1.5 rounded-xl bg-sky-shade/35 p-1.5 sm:grid-cols-3">
        {[
          {
            icon: Coins,
            label: lo.committee.overview.collected,
            value: formatKip(collected),
            dot: "bg-primary",
            split: split
              ? [
                  {
                    icon: Landmark,
                    label: lo.committee.overview.byTransfer,
                    value: split.transfer,
                  },
                  { icon: Banknote, label: lo.committee.overview.byCash, value: split.cash },
                ]
              : null,
          },
          {
            icon: Receipt,
            label: lo.committee.overview.expenses,
            value: formatKip(spent),
            dot: "bg-status-rejected",
          },
          {
            icon: Hourglass,
            label: lo.committee.overview.pending,
            value: String(pending),
            dot: "bg-gold",
            href: "/committee/review",
          },
        ].map((s) => {
          const body = (
            <>
              <span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-white/85 sm:text-[11px]">
                <s.icon className="size-3.5 shrink-0" strokeWidth={2.6} aria-hidden />
                <span className="truncate">{s.label}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5 sm:mt-0.5">
                <span className={cn("size-2 shrink-0 rounded-full", s.dot)} aria-hidden />
                <span className="money text-base font-black whitespace-nowrap sm:text-lg">
                  {s.value}
                </span>
              </span>
              {"split" in s && s.split ? (
                // Transfer / cash: two clear sub-tiles under the total.
                <span className="grid basis-full grid-cols-2 gap-1.5 sm:w-full">
                  {s.split.map((x) => (
                    <span
                      key={x.label}
                      className="flex min-w-0 items-center gap-2 rounded-md bg-white/15 px-2 py-1.5"
                    >
                      <x.icon className="size-5 shrink-0" strokeWidth={2.4} aria-hidden />
                      <span className="min-w-0 leading-tight">
                        <span className="block text-[11px] font-semibold text-white/80">
                          {x.label}
                        </span>
                        <span className="block truncate money text-sm font-black">
                          {formatKip(x.value)}
                        </span>
                      </span>
                    </span>
                  ))}
                </span>
              ) : null}
            </>
          );
          // Phones: one row per figure (label left, amount right); wider screens: three tiles.
          const tile =
            "flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg bg-white/15 px-3 py-2 sm:flex-col sm:flex-nowrap sm:items-start sm:justify-start sm:px-2.5";
          return s.href ? (
            <Link key={s.label} href={s.href} className={cn(tile, "hover:bg-white/25")}>
              {body}
            </Link>
          ) : (
            <div key={s.label} className={tile}>
              {body}
            </div>
          );
        })}
      </div>
    </section>
  );
}
