"use client";

import { useMemo, useState } from "react";
import { Paperclip, Pencil, Plus, Receipt, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { DemoExpense } from "@/lib/demo-committee";
import { formatDateLo, formatMonthLo } from "@/lib/format";
import { lo } from "@/lib/i18n/lo";
import { formatKip, parseKip } from "@/lib/money";
import { isIsoDate, type IsoDate } from "@/lib/week";

const t = lo.committee.expenses;
const field = "h-11 rounded-2xl border-2 px-4 text-base md:text-sm";

type Draft = { id: string | null; title: string; amount: string; date: IsoDate; note: string };

export function ExpensesManager({ initial, today }: { initial: DemoExpense[]; today: IsoDate }) {
  const [items, setItems] = useState(initial);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<DemoExpense | null>(null);

  const total = items.reduce((s, e) => s + e.amount, 0);
  const groups = useMemo(() => {
    const sorted = [...items].sort((a, b) => b.spent_at.localeCompare(a.spent_at));
    const map = new Map<string, DemoExpense[]>();
    for (const e of sorted) {
      const k = formatMonthLo(e.spent_at);
      map.set(k, [...(map.get(k) ?? []), e]);
    }
    return [...map];
  }, [items]);

  function save() {
    if (!draft) return;
    const amount = parseKip(draft.amount);
    if (!draft.title.trim() || !amount || !isIsoDate(draft.date))
      return void toast.error(t.invalid);
    const next: DemoExpense = {
      id: draft.id ?? `exp-${Date.now()}`,
      title: draft.title.trim(),
      amount,
      spent_at: draft.date,
      note: draft.note.trim() || null,
      hasReceipt: items.find((i) => i.id === draft.id)?.hasReceipt ?? false,
    };
    setItems((all) => (draft.id ? all.map((i) => (i.id === draft.id ? next : i)) : [...all, next]));
    toast.success(t.saved);
    setDraft(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <Button
          variant="chunky"
          className="h-11 px-4"
          onClick={() => setDraft({ id: null, title: "", amount: "", date: today, note: "" })}
        >
          <Plus className="size-4" /> {t.add}
        </Button>
      </div>

      <section className="press-3d rounded-2xl bg-status-rejected p-5 text-white [--press-shade:color-mix(in_oklch,var(--status-rejected),black_25%)] active:transform-none">
        <p className="text-sm font-bold text-white/85">{t.total}</p>
        <p className="money text-3xl font-black">{formatKip(total)}</p>
      </section>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed py-14 text-muted-foreground">
          <Receipt className="size-10" strokeWidth={1.6} aria-hidden />
          <p className="font-bold">{t.empty}</p>
        </div>
      ) : (
        groups.map(([month, list]) => (
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
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t.edit}
                    onClick={() =>
                      setDraft({
                        id: e.id,
                        title: e.title,
                        amount: String(e.amount),
                        date: e.spent_at,
                        note: e.note ?? "",
                      })
                    }
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t.delete}
                    onClick={() => setDeleting(e)}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <Dialog open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="gap-3 rounded-3xl p-5 sm:max-w-md">
          <DialogTitle className="text-lg font-bold">{draft?.id ? t.edit : t.add}</DialogTitle>
          <DialogDescription className="sr-only">{t.add}</DialogDescription>
          {draft ? (
            <>
              <Input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder={t.itemTitle}
                aria-label={t.itemTitle}
                maxLength={100}
                className={field}
              />
              <Input
                value={draft.amount}
                onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
                placeholder={t.amount}
                aria-label={t.amount}
                inputMode="numeric"
                className={`${field} money`}
              />
              <Input
                type="date"
                value={draft.date}
                max={today}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                aria-label={t.date}
                className={field}
              />
              <Input
                value={draft.note}
                onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                placeholder={t.note}
                aria-label={t.note}
                maxLength={200}
                className={field}
              />
              <Button variant="chunky" size="xl" className="mt-2" onClick={save}>
                {lo.common.save}
              </Button>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="gap-4 rounded-3xl p-5 sm:max-w-sm">
          <DialogTitle className="text-lg font-bold">{t.delete}</DialogTitle>
          <DialogDescription>
            {deleting?.title} · {t.deleteConfirm}
          </DialogDescription>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="tile" size="xl" onClick={() => setDeleting(null)}>
              {lo.common.cancel}
            </Button>
            <Button
              variant="chunky-danger"
              size="xl"
              onClick={() => {
                setItems((all) => all.filter((i) => i.id !== deleting?.id));
                toast.success(t.deleted);
                setDeleting(null);
              }}
            >
              {t.delete}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
