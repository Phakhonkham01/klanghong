"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Lock, Plus, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import { addCashPaymentAction, cancelCashPaymentAction } from "@/app/actions/payments";
import { dotClass } from "@/components/student/status-style";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatWeekRange } from "@/lib/format";
import { lo } from "@/lib/i18n/lo";
import { formatKip } from "@/lib/money";
import type { OpenWeek } from "@/lib/status";
import { cn } from "@/lib/utils";
import { MAX_WEEKS_PER_SLIP } from "@/lib/week";

const t = lo.committee.members;

/**
 * Record cash received for one or more weeks. Same rules as a transfer: weeks are taken in order
 * from the oldest open week (tap a week to take every week up to it), up to 7, ahead allowed.
 */
export function CashPaymentButton({
  weeks,
  weeklyAmount,
  studentId,
  studentName,
  className,
}: {
  /** Open weeks in pay order (owed first, then weeks ahead). */
  weeks: OpenWeek[];
  weeklyAmount: number;
  studentId: string;
  studentName: string;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(1);
  const [note, setNote] = useState<string>(lo.history.cash);
  const [saving, setSaving] = useState(false);
  const picked = weeks.slice(0, count).map((w) => w.weekStart);

  return (
    <>
      <Button
        variant="chunky"
        size="lg"
        className={cn("h-11 px-4", className)}
        disabled={weeks.length === 0}
        onClick={() => {
          setCount(1);
          setOpen(true);
        }}
      >
        <Banknote className="size-5" /> {t.addCash}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] gap-3 overflow-y-auto rounded-3xl p-5 sm:max-w-md">
          <div>
            <DialogTitle className="text-lg font-bold">{t.cashTitle}</DialogTitle>
            <DialogDescription>{studentName}</DialogDescription>
          </div>
          <p className="text-sm font-bold">
            {t.cashWeek}{" "}
            <span className="font-semibold text-muted-foreground">
              ({lo.pay.maxWeeks(count, MAX_WEEKS_PER_SLIP)})
            </span>
          </p>
          <div className="flex flex-col gap-1.5">
            {weeks.slice(0, MAX_WEEKS_PER_SLIP + 1).map((w, i) => {
              const on = i < count;
              const locked = i >= MAX_WEEKS_PER_SLIP;
              const Badge = on ? X : locked ? Lock : Plus;
              return (
                <button
                  key={w.weekStart}
                  type="button"
                  disabled={locked}
                  aria-pressed={on}
                  // In order: tapping a week takes every week up to it; tapping a taken week
                  // drops it and the ones after it.
                  onClick={() => setCount(on ? i : i + 1)}
                  className={cn(
                    "flex min-h-11 press-3d items-center gap-2 rounded-2xl border-2 px-3 text-sm font-bold [--press-depth:3px]",
                    on
                      ? "border-primary bg-primary text-white [--press-shade:var(--brand-shade)]"
                      : i === count
                        ? "border-sky bg-sky/10 [--press-shade:var(--sky-shade)]"
                        : "border-tile-shade bg-tile [--press-shade:var(--tile-shade)]",
                    locked && "opacity-45",
                  )}
                >
                  <span
                    className={cn(
                      "size-2.5 shrink-0 rounded-full",
                      on && "ring-2 ring-white",
                      w.ahead ? "bg-sky" : dotClass[w.status],
                    )}
                    aria-hidden
                  />
                  <span className="flex-1 text-left">{formatWeekRange(w.weekStart)}</span>
                  {w.ahead ? (
                    <span className={cn("text-[11px]", on ? "text-white/80" : "text-sky")}>
                      {lo.pay.payAhead}
                    </span>
                  ) : null}
                  <Badge className="size-4" strokeWidth={3} aria-hidden />
                </button>
              );
            })}
          </div>
          <p className="text-right text-sm font-semibold text-muted-foreground">
            {lo.pay.total}{" "}
            <span className="money text-lg font-black text-foreground">
              {formatKip(count * weeklyAmount)}
            </span>
          </p>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            aria-label={lo.history.note}
            className="h-11 rounded-2xl border-2 px-4"
          />
          <Button
            variant="chunky"
            size="xl"
            disabled={count === 0 || saving}
            onClick={async () => {
              setSaving(true);
              const r = await addCashPaymentAction(studentId, picked, note).catch(() => null);
              setSaving(false);
              if (!r || !r.ok) return void toast.error(r && !r.ok ? r.error : lo.errors.generic);
              toast.success(t.cashSavedReal(r.data));
              setOpen(false);
              router.refresh();
            }}
          >
            {saving ? lo.common.loading : lo.common.save}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Undo one cash payment (asks first). */
export function CancelCashButton({ paymentId, label }: { paymentId: string; label: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 gap-1 px-2 text-xs text-destructive"
        onClick={() => setOpen(true)}
      >
        <Undo2 className="size-3.5" /> {t.cancelCash}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-4 rounded-3xl p-5 sm:max-w-sm">
          <DialogTitle className="text-lg font-bold">{t.cancelCashTitle}</DialogTitle>
          <DialogDescription>{t.cancelCashBody(label)}</DialogDescription>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="tile" className="h-11" onClick={() => setOpen(false)}>
              {lo.common.cancel}
            </Button>
            <Button
              variant="chunky-danger"
              className="h-11"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const r = await cancelCashPaymentAction(paymentId).catch(() => null);
                setBusy(false);
                if (!r || !r.ok) {
                  return void toast.error(r && !r.ok ? r.error : lo.errors.generic);
                }
                toast.success(t.cashCancelled);
                setOpen(false);
                router.refresh();
              }}
            >
              {busy ? lo.common.loading : t.cancelCash}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
