"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Check, ChevronLeft, ChevronRight, Inbox, Keyboard, X } from "lucide-react";
import { toast } from "sonner";
import { dotClass, paymentStyle } from "@/components/student/status-style";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { reviewPaymentAction } from "@/app/actions/payments";
import { SlipImage } from "@/components/slip-image";
import type { PaymentView } from "@/lib/data/types";
import { formatDateLo, formatDateTimeLo, formatWeekRange } from "@/lib/format";
import { lo } from "@/lib/i18n/lo";
import { formatKip } from "@/lib/money";
import type { PaymentStatus, WeekStatus } from "@/lib/status";
import type { IsoDate } from "@/lib/week";
import { cn } from "@/lib/utils";

export interface ReviewItem extends PaymentView {
  studentName: string;
  studentCode: string;
  recent: { weekStart: IsoDate; status: WeekStatus }[];
}

const TABS: PaymentStatus[] = ["pending", "approved", "rejected"];
const t = lo.committee.review;

function useIsDesktop() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(min-width: 1024px)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => false,
  );
}

function Detail({
  item,
  onApprove,
  onReject,
  onZoom,
}: {
  item: ReviewItem;
  onApprove: () => void;
  onReject: () => void;
  onZoom: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-lg font-bold">{item.studentName}</p>
        <p className="money text-sm text-muted-foreground">{item.studentCode}</p>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-muted/60 p-2.5">
          <dt className="text-xs text-muted-foreground">{lo.history.week}</dt>
          <dd className="font-bold">{formatWeekRange(item.week_start)}</dd>
        </div>
        <div className="rounded-xl bg-muted/60 p-2.5">
          <dt className="text-xs text-muted-foreground">{lo.history.amount}</dt>
          <dd className="money font-bold">{formatKip(item.amount)}</dd>
        </div>
        <div className="col-span-2 rounded-xl bg-muted/60 p-2.5">
          <dt className="text-xs text-muted-foreground">{t.submitted}</dt>
          <dd className="font-bold">{formatDateTimeLo(item.created_at)}</dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={onZoom}
        className="block w-full rounded-2xl border-2 border-dashed p-3 hover:bg-muted/50"
        aria-label={t.zoom}
      >
        <SlipImage
          paymentId={item.id}
          alt={`${t.slip} · ${item.studentName}`}
          className="mx-auto h-72 w-full rounded-xl"
        />
        <span className="mt-2 block text-center text-xs font-bold text-sky">{t.zoom}</span>
      </button>

      <div>
        <p className="mb-2 text-xs font-bold text-muted-foreground">{t.studentHistory}</p>
        <ol className="flex gap-1.5">
          {item.recent.map((r) => (
            <li
              key={r.weekStart}
              title={`${formatDateLo(r.weekStart, false)} · ${lo.status[r.status]}`}
              className={cn(
                "h-6 flex-1 rounded-md",
                dotClass[r.status],
                r.weekStart === item.week_start &&
                  "ring-2 ring-foreground ring-offset-2 ring-offset-background",
              )}
            >
              <span className="sr-only">
                {formatDateLo(r.weekStart, false)} {lo.status[r.status]}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {item.status === "pending" ? (
        <div className="grid grid-cols-2 gap-3">
          <Button variant="chunky-danger" size="xl" onClick={onReject}>
            <X className="size-5" strokeWidth={3} /> {t.reject}
          </Button>
          <Button variant="chunky" size="xl" onClick={onApprove}>
            <Check className="size-5" strokeWidth={3} /> {t.approve}
          </Button>
        </div>
      ) : (
        <div className={cn("rounded-2xl p-3", paymentStyle[item.status].soft)}>
          <p className="font-bold">{lo.status[item.status]}</p>
          {item.reject_reason ? <p className="text-sm">{item.reject_reason}</p> : null}
          {item.reviewer ? (
            <p className="text-xs opacity-80">
              {t.reviewedBy} {item.reviewer}
              {item.reviewed_at ? ` · ${formatDateTimeLo(item.reviewed_at)}` : ""}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function ReviewQueue({
  initialItems,
  reviewerName,
}: {
  initialItems: ReviewItem[];
  reviewerName: string;
}) {
  const [items, setItems] = useState(initialItems);
  // Fresh server data (after revalidation) replaces optimistic state.
  const [seen, setSeen] = useState(initialItems);
  if (seen !== initialItems) {
    setSeen(initialItems);
    setItems(initialItems);
  }
  const [tab, setTab] = useState<PaymentStatus>("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [reason, setReason] = useState("");
  const isDesktop = useIsDesktop();

  const list = useMemo(() => {
    const l = items.filter((i) => i.status === tab);
    // Pending: oldest first (queue). Reviewed: newest first.
    return l.sort((a, b) =>
      tab === "pending"
        ? a.created_at.localeCompare(b.created_at)
        : (b.reviewed_at ?? "").localeCompare(a.reviewed_at ?? ""),
    );
  }, [items, tab]);

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0 };
    for (const i of items) c[i.status]++;
    return c;
  }, [items]);

  const index = list.findIndex((i) => i.id === selectedId);
  const selected = index >= 0 ? list[index]! : null;
  const activeItem = selected ?? (isDesktop ? (list[0] ?? null) : null);

  const move = useCallback(
    (delta: number) => {
      if (!list.length) return;
      const cur = list.findIndex((i) => i.id === activeItem?.id);
      const next = list[Math.min(list.length - 1, Math.max(0, cur + delta))];
      if (next) setSelectedId(next.id);
    },
    [list, activeItem],
  );

  const decide = useCallback(
    (item: ReviewItem, status: "approved" | "rejected", why?: string) => {
      // Pick the next pending item before this one leaves the list.
      const pos = list.findIndex((i) => i.id === item.id);
      const next = list[pos + 1] ?? list[pos - 1];
      const before = item;
      // Optimistic: move it now, roll back if the server refuses.
      setItems((all) =>
        all.map((i) =>
          i.id === item.id
            ? {
                ...i,
                status,
                reject_reason: why ?? null,
                reviewer: reviewerName,
                reviewed_at: new Date().toISOString(),
              }
            : i,
        ),
      );
      setSelectedId(isDesktop && next ? next.id : null);
      reviewPaymentAction(item.id, status, why)
        .then((r) => {
          if (r.ok) {
            toast.success(
              `${status === "approved" ? t.approved : t.rejected} · ${item.studentName}`,
            );
          } else {
            setItems((all) => all.map((i) => (i.id === before.id ? before : i)));
            toast.error(r.error);
          }
        })
        .catch(() => {
          setItems((all) => all.map((i) => (i.id === before.id ? before : i)));
          toast.error(lo.errors.generic);
        });
    },
    [list, isDesktop, reviewerName],
  );

  const openReject = useCallback(() => {
    setReason("");
    setRejecting(true);
  }, []);

  // Desktop keyboard shortcuts.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!isDesktop || rejecting || zoom || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight") move(1);
      else if (e.key === "ArrowLeft") move(-1);
      else if (activeItem?.status === "pending" && e.key.toLowerCase() === "a")
        decide(activeItem, "approved");
      else if (activeItem?.status === "pending" && e.key.toLowerCase() === "r") openReject();
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isDesktop, rejecting, zoom, move, decide, openReject, activeItem]);

  const reasonOk = reason.trim().length >= 5;

  const detail = activeItem ? (
    <Detail
      item={activeItem}
      onApprove={() => decide(activeItem, "approved")}
      onReject={openReject}
      onZoom={() => setZoom(true)}
    />
  ) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <p className="hidden items-center gap-1.5 text-xs text-muted-foreground lg:flex">
          <Keyboard className="size-4" aria-hidden /> {t.shortcuts}
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" role="group">
        {TABS.map((s) => (
          <Button
            key={s}
            aria-pressed={tab === s}
            variant="tile"
            className="h-10 shrink-0 px-4"
            onClick={() => {
              setTab(s);
              setSelectedId(null);
            }}
          >
            {lo.status[s]}
            <span className={cn("rounded-full px-1.5 money text-xs", paymentStyle[s].soft)}>
              {counts[s]}
            </span>
          </Button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {list.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed py-16 text-center text-muted-foreground">
            <Inbox className="size-12" strokeWidth={1.6} aria-hidden />
            <p className="font-bold text-foreground">{t.empty}</p>
            {tab === "pending" ? <p className="text-sm">{t.emptyHint}</p> : null}
          </div>
        ) : (
          <ol className="space-y-2.5">
            {list.map((item) => {
              const active = activeItem?.id === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "flex w-full press-3d items-center gap-3 rounded-2xl border-2 border-tile-shade bg-tile p-3 text-left [--press-depth:3px] hover:bg-muted/50",
                      active && isDesktop && "border-sky bg-sky/5 [--press-shade:var(--sky)]",
                    )}
                  >
                    <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-sky/15 text-xs font-black text-sky">
                      {formatKip(item.amount).replace(" ₭", "")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{item.studentName}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {formatWeekRange(item.week_start)} · {formatDateTimeLo(item.created_at)}
                      </span>
                      {item.reject_reason ? (
                        <span className="block truncate text-xs font-semibold text-status-rejected">
                          {item.reject_reason}
                        </span>
                      ) : null}
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ol>
        )}

        {/* Desktop detail panel */}
        {isDesktop ? (
          <aside className="sticky top-6 self-start rounded-2xl border-2 p-4">
            {detail ?? (
              <p className="py-10 text-center text-sm text-muted-foreground">{t.selectHint}</p>
            )}
            {activeItem && list.length > 1 ? (
              <div className="mt-4 flex justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => move(-1)}
                  aria-label={lo.common.back}
                >
                  <ChevronLeft />
                </Button>
                <span className="money text-xs text-muted-foreground">
                  {list.findIndex((i) => i.id === activeItem.id) + 1}/{list.length}
                </span>
                <Button variant="ghost" size="sm" onClick={() => move(1)} aria-label={lo.pay.next}>
                  <ChevronRight />
                </Button>
              </div>
            ) : null}
          </aside>
        ) : null}
      </div>

      {/* Mobile detail drawer */}
      {!isDesktop ? (
        <Drawer open={selected !== null} onOpenChange={(o) => !o && setSelectedId(null)}>
          <DrawerContent className="mx-auto max-w-xl rounded-t-3xl">
            <DrawerTitle className="sr-only">{t.slip}</DrawerTitle>
            <div className="overflow-y-auto p-5">{detail}</div>
          </DrawerContent>
        </Drawer>
      ) : null}

      {/* Zoomed slip */}
      <Dialog open={zoom} onOpenChange={setZoom}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogTitle>{t.slip}</DialogTitle>
          <DialogDescription className="sr-only">{activeItem?.studentName}</DialogDescription>
          {activeItem ? (
            <SlipImage
              paymentId={activeItem.id}
              alt={`${t.slip} · ${activeItem.studentName}`}
              className="max-h-[75dvh] min-h-60 w-full rounded-xl"
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Reject reason */}
      <Dialog open={rejecting} onOpenChange={setRejecting}>
        <DialogContent className="gap-4 rounded-3xl p-5 sm:max-w-md">
          <div>
            <DialogTitle className="text-lg font-bold">{t.rejectTitle}</DialogTitle>
            <DialogDescription>
              {activeItem?.studentName} · {t.rejectHint}
            </DialogDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {t.quickReasons.map((r) => (
              <Button
                key={r}
                type="button"
                variant="tile"
                size="sm"
                className="h-9 px-3"
                aria-pressed={reason === r}
                onClick={() => setReason(r)}
              >
                {r}
              </Button>
            ))}
          </div>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t.reasonPlaceholder}
            aria-label={t.rejectTitle}
            aria-invalid={reason.length > 0 && !reasonOk}
            maxLength={200}
            className="min-h-24 rounded-2xl border-2 p-3 text-base"
          />
          {reason.length > 0 && !reasonOk ? (
            <p className="text-sm font-semibold text-destructive">{t.reasonTooShort}</p>
          ) : null}
          <Button
            variant="chunky-danger"
            size="xl"
            disabled={!reasonOk}
            onClick={() => {
              if (activeItem) decide(activeItem, "rejected", reason.trim());
              setRejecting(false);
            }}
          >
            {t.confirmReject}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
