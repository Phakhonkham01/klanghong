"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Receipt } from "lucide-react";
import { toast } from "sonner";
import { saveExpenseAction } from "@/app/actions/committee";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { lo } from "@/lib/i18n/lo";
import { formatKip, parseKip } from "@/lib/money";
import { isIsoDate, todayInTz } from "@/lib/week";

const t = lo.committee.expenses;
const field = "h-11 rounded-2xl border-2 px-4 text-base md:text-sm";
const QUICK_AMOUNTS = [5000, 10000, 20000, 50000];

/**
 * Floating "+ expense" button on every committee page: opens a short form (item, amount, date,
 * note) and saves without leaving the page. Sits above the phone bottom bar.
 */
export function QuickExpenseButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayInTz());
  const [note, setNote] = useState("");

  function reset() {
    setTitle("");
    setAmount("");
    setDate(todayInTz());
    setNote("");
  }

  async function save() {
    const n = parseKip(amount);
    if (!title.trim() || !n || !isIsoDate(date)) return void toast.error(t.invalid);
    setBusy(true);
    const r = await saveExpenseAction({ id: null, title, amount, date, note }).catch(() => null);
    setBusy(false);
    if (!r || !r.ok) return void toast.error(r && !r.ok ? r.error : lo.errors.generic);
    toast.success(t.saved);
    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setDate(todayInTz());
          setOpen(true);
        }}
        aria-label={t.add}
        className="fixed right-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-40 flex h-14 press-3d items-center gap-2 rounded-full bg-primary pr-5 pl-4 font-bold text-primary-foreground shadow-lg [--press-depth:4px] [--press-shade:var(--brand-shade)] hover:brightness-105 lg:right-8 lg:bottom-8"
      >
        <span className="relative">
          <Receipt className="size-6" strokeWidth={2.4} aria-hidden />
          <Plus
            className="absolute -right-1.5 -bottom-1 size-4 rounded-full bg-primary-foreground text-primary"
            strokeWidth={3.5}
            aria-hidden
          />
        </span>
        <span className="text-sm">{t.add}</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-3 rounded-3xl p-5 sm:max-w-md">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Receipt className="size-5 text-primary" aria-hidden /> {t.add}
          </DialogTitle>
          <DialogDescription className="sr-only">{t.add}</DialogDescription>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.itemTitle}
            aria-label={t.itemTitle}
            maxLength={100}
            autoFocus
            className={field}
          />
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={t.amount}
            aria-label={t.amount}
            inputMode="numeric"
            className={`${field} money text-lg font-bold md:text-lg`}
          />
          <div className="flex flex-wrap gap-1.5">
            {QUICK_AMOUNTS.map((v) => (
              <Button
                key={v}
                type="button"
                variant="tile"
                size="sm"
                className="h-8 px-2.5 money text-xs"
                aria-pressed={parseKip(amount) === v}
                onClick={() => setAmount(String(v))}
              >
                {formatKip(v)}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              value={date}
              max={todayInTz()}
              onChange={(e) => setDate(e.target.value)}
              aria-label={t.date}
              className={field}
            />
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.note}
              aria-label={t.note}
              maxLength={200}
              className={field}
            />
          </div>
          <Button variant="chunky" size="xl" className="mt-1" disabled={busy} onClick={save}>
            {busy ? lo.common.loading : lo.common.save}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
