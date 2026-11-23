"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Banknote, ChevronRight, Inbox } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { SlipImage } from "@/components/slip-image";
import type { PaymentView } from "@/lib/data/types";
import { formatDateTimeLo, formatMonthLo, formatWeekRange } from "@/lib/format";
import { lo } from "@/lib/i18n/lo";
import { formatKip } from "@/lib/money";
import type { PaymentStatus } from "@/lib/status";
import { cn } from "@/lib/utils";
import { paymentStyle } from "./status-style";

type Filter = "all" | PaymentStatus;
const FILTERS: Filter[] = ["all", "approved", "pending", "rejected"];

function filterLabel(f: Filter) {
  return f === "all" ? lo.history.all : lo.status[f];
}

function StatusChip({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap",
        paymentStyle[status].soft,
      )}
    >
      {lo.status[status]}
    </span>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-bold">{value}</dd>
    </div>
  );
}

function Detail({ payment }: { payment: PaymentView }) {
  const style = paymentStyle[payment.status];
  const Icon = style.icon;
  return (
    <div className="flex min-h-0 flex-col">
      {/* Result banner, like the feedback sheet after an answer. */}
      <div className={cn("flex items-center gap-3 px-5 pt-6 pb-4", style.soft)}>
        <span className={cn("grid size-11 place-items-center rounded-full", style.fill)}>
          <Icon className="size-6" strokeWidth={2.8} aria-hidden />
        </span>
        <div>
          <DrawerTitle className="text-xl font-bold text-inherit">
            {lo.status[payment.status]}
          </DrawerTitle>
          <DrawerDescription className="text-sm font-semibold text-inherit opacity-90">
            {lo.history.statusLine[payment.status]}
          </DrawerDescription>
        </div>
      </div>

      <div className="overflow-y-auto px-5 pb-6">
        {payment.status === "rejected" && payment.reject_reason ? (
          <div className="mt-4 rounded-2xl border-2 border-status-rejected/30 bg-status-rejected-bg p-3">
            <p className="text-xs font-bold text-status-rejected">{lo.history.rejectReason}</p>
            <p className="font-bold">{payment.reject_reason}</p>
          </div>
        ) : null}

        <div className="mt-4 grid min-h-40 place-items-center overflow-hidden rounded-2xl border-2 border-dashed p-2 text-center text-muted-foreground">
          {payment.source === "cash" ? (
            <span className="flex flex-col items-center gap-2 font-bold text-status-paid">
              <Banknote className="size-10" strokeWidth={2} aria-hidden />
              {lo.history.cash}
            </span>
          ) : (
            <SlipImage
              paymentId={payment.id}
              alt={`${lo.committee.review.slip} ${formatWeekRange(payment.week_start)}`}
              className="max-h-96 min-h-36 w-full rounded-xl"
            />
          )}
        </div>

        <dl className="mt-3 divide-y">
          <Row label={lo.history.week} value={formatWeekRange(payment.week_start)} />
          <Row
            label={lo.history.amount}
            value={<span className="money">{formatKip(payment.amount)}</span>}
          />
          <Row label={lo.history.submittedAt} value={formatDateTimeLo(payment.created_at)} />
          {payment.reviewer ? <Row label={lo.history.reviewedBy} value={payment.reviewer} /> : null}
          {payment.reviewed_at && payment.status !== "pending" ? (
            <Row label={lo.history.reviewedAt} value={formatDateTimeLo(payment.reviewed_at)} />
          ) : null}
          {payment.reference ? (
            <Row
              label={lo.history.reference}
              value={<span className="money">{payment.reference}</span>}
            />
          ) : null}
          {payment.note ? <Row label={lo.history.note} value={payment.note} /> : null}
        </dl>

        <div className="mt-5 space-y-3">
          {payment.status === "rejected" ? (
            <Link
              href={`/pay?week=${payment.week_start}`}
              className={cn(buttonVariants({ variant: "chunky", size: "xl" }), "w-full")}
            >
              {lo.history.resubmit}
            </Link>
          ) : null}
          <DrawerClose render={<Button variant="tile" size="xl" className="w-full" />}>
            {lo.history.close}
          </DrawerClose>
        </div>
      </div>
    </div>
  );
}

export function HistoryList({ payments }: { payments: PaymentView[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<PaymentView | null>(null);

  const counts = useMemo(() => {
    const c = { all: payments.length, approved: 0, pending: 0, rejected: 0 };
    for (const p of payments) c[p.status]++;
    return c;
  }, [payments]);

  const approvedTotal = payments
    .filter((p) => p.status === "approved")
    .reduce((s, p) => s + p.amount, 0);

  // Group by month of the week the payment is for (already newest first).
  const groups = useMemo(() => {
    const list = filter === "all" ? payments : payments.filter((p) => p.status === filter);
    const map = new Map<string, PaymentView[]>();
    for (const p of list) {
      const key = formatMonthLo(p.week_start);
      map.set(key, [...(map.get(key) ?? []), p]);
    }
    return [...map];
  }, [payments, filter]);

  return (
    <div className="space-y-5 pt-2">
      <h1 className="text-2xl font-bold">{lo.history.title}</h1>

      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-2">
        {(["approved", "pending", "rejected"] as const).map((s) => {
          const Icon = paymentStyle[s].icon;
          return (
            <div key={s} className="rounded-2xl border-2 p-3">
              <Icon className={cn("size-5", paymentStyle[s].text)} strokeWidth={2.8} aria-hidden />
              <p className="mt-1 money text-xl font-bold">
                {s === "approved" ? formatKip(approvedTotal) : counts[s]}
              </p>
              <p className="text-xs font-semibold text-muted-foreground">
                {s === "approved" ? lo.history.weeksCount(counts.approved) : lo.status[s]}
              </p>
            </div>
          );
        })}
      </div>

      {/* Filter chips */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group">
        {FILTERS.map((f) => (
          <Button
            key={f}
            variant="tile"
            size="sm"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className="h-9 shrink-0 px-3.5 text-sm"
          >
            {filterLabel(f)}
            <span className="money text-xs opacity-70">{counts[f]}</span>
          </Button>
        ))}
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-14 text-center text-muted-foreground">
          <Inbox className="size-12" strokeWidth={1.6} aria-hidden />
          <p className="font-bold text-foreground">{lo.history.empty}</p>
          <p className="text-sm">{lo.history.emptyHint}</p>
        </div>
      ) : (
        groups.map(([month, items]) => (
          <section key={month}>
            <h2 className="mb-2 text-sm font-bold text-muted-foreground">{month}</h2>
            <ol className="space-y-3">
              {items.map((p) => {
                const style = paymentStyle[p.status];
                const Icon = style.icon;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(p)}
                      className="flex w-full press-3d items-center gap-3 rounded-2xl border-2 border-tile-shade bg-tile p-3 text-left [--press-depth:3px] hover:bg-muted/50"
                    >
                      <span
                        className={cn(
                          "grid size-11 shrink-0 place-items-center rounded-full",
                          style.fill,
                        )}
                      >
                        <Icon className="size-5" strokeWidth={2.8} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold">
                          {formatWeekRange(p.week_start)}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {p.source === "cash" ? `${lo.history.cash} · ` : ""}
                          {formatDateTimeLo(p.created_at)}
                        </span>
                        {p.status === "rejected" && p.reject_reason ? (
                          <span className="block truncate text-xs font-semibold text-status-rejected">
                            {p.reject_reason}
                          </span>
                        ) : null}
                      </span>
                      <span className="flex flex-col items-end gap-1">
                        <span className="money font-bold">{formatKip(p.amount)}</span>
                        <StatusChip status={p.status} />
                      </span>
                      <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        ))
      )}

      <Drawer open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DrawerContent className="mx-auto max-w-xl overflow-hidden rounded-t-3xl">
          {selected ? <Detail payment={selected} /> : null}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
