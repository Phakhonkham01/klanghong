import { Paperclip, Receipt } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getExpenses, getFundSummary } from "@/lib/data/queries";
import { formatDateLo, formatMonthLo } from "@/lib/format";
import { lo } from "@/lib/i18n/lo";
import { formatKip } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata = { title: lo.nav.classExpenses };

const t = lo.classExpenses;

/** Read-only list of class expenses, open to every member for transparency. */
export default async function Page() {
  await requireSession();
  const [fund, expenses] = await Promise.all([getFundSummary(), getExpenses()]);

  // Newest month first (getExpenses is already ordered by date, newest first).
  const groups = new Map<string, typeof expenses>();
  for (const e of expenses) {
    const k = formatMonthLo(e.spent_at);
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }

  const tiles = [
    { label: t.collected, value: fund.totalApproved, tone: "text-status-paid" },
    { label: t.spent, value: fund.totalExpenses, tone: "text-status-rejected" },
    { label: t.balance, value: fund.balance, tone: "text-sky" },
  ];

  return (
    <div className="space-y-5 pt-2">
      <div>
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.subtitle}</p>
      </div>

      <dl className="grid grid-cols-3 gap-2">
        {tiles.map((s) => (
          <div key={s.label} className="rounded-2xl border-2 p-3">
            <dt className="text-xs font-bold text-muted-foreground">{s.label}</dt>
            <dd className={cn("mt-1 money text-sm font-black sm:text-lg", s.tone)}>
              {formatKip(s.value)}
            </dd>
          </div>
        ))}
      </dl>

      {groups.size === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed py-14 text-muted-foreground">
          <Receipt className="size-10" strokeWidth={1.6} aria-hidden />
          <p className="font-bold">{t.empty}</p>
        </div>
      ) : (
        [...groups].map(([month, list]) => (
          <section key={month}>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-sm font-bold text-muted-foreground">{month}</h2>
              <span className="money text-sm font-bold">
                {formatKip(list.reduce((s, e) => s + e.amount, 0))}
              </span>
            </div>
            <ul className="divide-y-2 overflow-hidden rounded-2xl border-2">
              {list.map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-status-rejected-bg text-status-rejected">
                    <Receipt className="size-5" strokeWidth={2.4} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{e.title}</p>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="whitespace-nowrap">{formatDateLo(e.spent_at)}</span>
                      {e.hasReceipt ? (
                        <span className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-sky">
                          <Paperclip className="size-3" aria-hidden /> {t.hasReceipt}
                        </span>
                      ) : null}
                      {e.note ? <span className="truncate">· {e.note}</span> : null}
                    </p>
                  </div>
                  <span className="money font-bold whitespace-nowrap">{formatKip(e.amount)}</span>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
