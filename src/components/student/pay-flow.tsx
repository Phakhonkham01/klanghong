"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarCheck,
  CircleCheck,
  Copy,
  ImageUp,
  Landmark,
  QrCode,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { submitPaymentAction } from "@/app/actions/payments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatWeekRange } from "@/lib/format";
import { lo } from "@/lib/i18n/lo";
import { formatKip } from "@/lib/money";
import type { WeekStatus } from "@/lib/status";
import type { IsoDate } from "@/lib/week";
import { cn } from "@/lib/utils";
import { dotClass } from "./status-style";

export type PayWeekOption = { weekStart: IsoDate; status: WeekStatus; isCurrent: boolean };

type Bank = { name: string; accountName: string; accountNo: string; qrUrl: string | null };

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 15 * 1024 * 1024; // before compression

/** Shrink phone photos (~1600px, ≤1 MB) before upload; falls back to the original. */
async function compressSlip(file: File): Promise<File> {
  try {
    const { default: imageCompression } = await import("browser-image-compression");
    const out = await imageCompression(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: 1600,
      initialQuality: 0.8,
      useWebWorker: true,
    });
    return new File([out], file.name, { type: out.type || file.type });
  } catch {
    return file;
  }
}
const STEP_ICONS: LucideIcon[] = [CalendarCheck, Landmark, ImageUp];

function WeekTile({
  option,
  pressed,
  onClick,
}: {
  option: PayWeekOption;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="tile"
      className="h-auto min-h-11 gap-2 px-3 py-2 text-sm"
      aria-pressed={pressed}
      onClick={onClick}
    >
      <span className={cn("size-2.5 rounded-full", dotClass[option.status])} aria-hidden />
      {formatWeekRange(option.weekStart)}
      <span className="sr-only">{lo.status[option.status]}</span>
    </Button>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <p className="truncate money font-bold">{value}</p>
      </div>
      <Button
        type="button"
        variant="tile"
        size="icon-lg"
        aria-label={`${lo.common.copy} ${label}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value.replace(/\s/g, ""));
            toast.success(lo.common.copied);
          } catch {
            toast.error(lo.errors.generic);
          }
        }}
      >
        <Copy className="size-4" />
      </Button>
    </div>
  );
}

export function PayFlow({
  options,
  initialWeeks,
  weeklyAmount,
  bank,
}: {
  options: PayWeekOption[];
  initialWeeks: IsoDate[];
  weeklyAmount: number;
  bank: Bank;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<IsoDate[]>(initialWeeks);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [burst, setBurst] = useState(false);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const total = selected.length * weeklyAmount;
  const ordered = options.filter((o) => selected.includes(o.weekStart));
  const progress = done ? 100 : (step / 3) * 100 + (step === 0 && selected.length ? 12 : 0);

  const toggle = (week: IsoDate) =>
    setSelected((s) => (s.includes(week) ? s.filter((w) => w !== week) : [...s, week]));

  const canContinue = step === 0 ? selected.length > 0 : step === 1 ? true : file !== null;

  function onFile(f: File | undefined) {
    if (!f) return;
    if (!ACCEPTED.includes(f.type)) return void toast.error(lo.pay.invalidType);
    if (f.size > MAX_BYTES) return void toast.error(lo.pay.tooLarge);
    setFile(f);
  }

  async function onPrimary() {
    if (step < 2) return setStep(step + 1);
    if (!file) return;
    setSubmitting(true);
    try {
      const form = new FormData();
      for (const w of ordered.map((o) => o.weekStart)) form.append("weeks", w);
      form.append("slip", await compressSlip(file));
      form.append("reference", reference);
      form.append("note", note);
      const result = await submitPaymentAction(form);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
    } catch {
      toast.error(lo.errors.generic);
      return;
    } finally {
      setSubmitting(false);
    }
    setDone(true);
    setBurst(true);
    setTimeout(() => setBurst(false), 1400);
  }

  const StepIcon = STEP_ICONS[step]!;

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-4">
      {/* Top bar: close/back + chunky progress */}
      <div className="sticky top-0 z-10 flex items-center gap-3 bg-background py-4">
        {step > 0 && !done ? (
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label={lo.common.back}
            onClick={() => setStep(step - 1)}
          >
            <ArrowLeft className="size-6 text-muted-foreground" strokeWidth={2.6} />
          </Button>
        ) : (
          <Link
            href="/dashboard"
            aria-label={lo.pay.close}
            className="grid size-9 place-items-center rounded-lg hover:bg-muted"
          >
            <X className="size-6 text-muted-foreground" strokeWidth={2.6} />
          </Link>
        )}
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          className="h-4 flex-1 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="relative h-full rounded-full bg-primary transition-[width] duration-500 ease-out after:absolute after:inset-x-2 after:top-1 after:h-1 after:rounded-full after:bg-white/30"
            style={{ width: `${Math.max(progress, 4)}%` }}
          />
        </div>
        <span className="money text-sm font-bold text-primary">{formatKip(total)}</span>
      </div>

      {options.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <CircleCheck className="size-16 text-status-paid" strokeWidth={2.2} />
          <p className="text-lg font-bold">{lo.pay.nothingToPay}</p>
          <Link href="/dashboard" className="font-bold text-primary">
            {lo.errors.goHome}
          </Link>
        </div>
      ) : (
        <main className="flex-1 pb-40">
          <p className="flex items-center gap-2 text-sm font-bold text-sky">
            <StepIcon className="size-5" strokeWidth={2.6} aria-hidden />
            {lo.pay.steps[step]} · {step + 1}/3
          </p>

          {step === 0 ? (
            <section>
              <h1 className="mt-2 text-2xl font-bold">{lo.pay.chooseTitle}</h1>
              <p className="text-sm text-muted-foreground">{lo.pay.chooseHint}</p>

              {/* "Answer" lines: chosen weeks move up here. */}
              <div className="mt-5 min-h-28 border-b-2 bg-[linear-gradient(to_bottom,transparent_calc(50%-1px),var(--border)_calc(50%-1px),var(--border)_calc(50%+1px),transparent_calc(50%+1px))] py-2">
                <div className="flex flex-wrap gap-2">
                  {ordered.map((o) => (
                    <WeekTile
                      key={o.weekStart}
                      option={o}
                      pressed
                      onClick={() => toggle(o.weekStart)}
                    />
                  ))}
                </div>
              </div>
              <p className="mt-3 text-right text-sm font-semibold text-muted-foreground">
                {lo.pay.total}{" "}
                <span className="money text-lg font-bold text-foreground">{formatKip(total)}</span>
              </p>

              {/* Word bank: picked tiles leave an empty slot behind. */}
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {options.map((o) =>
                  selected.includes(o.weekStart) ? (
                    <span
                      key={o.weekStart}
                      aria-hidden
                      className="min-h-11 rounded-2xl bg-muted px-3 py-2 text-sm text-transparent select-none"
                    >
                      ● {formatWeekRange(o.weekStart)}
                    </span>
                  ) : (
                    <WeekTile
                      key={o.weekStart}
                      option={o}
                      pressed={false}
                      onClick={() => toggle(o.weekStart)}
                    />
                  ),
                )}
              </div>
            </section>
          ) : null}

          {step === 1 ? (
            <section>
              <h1 className="mt-2 text-2xl font-bold">{lo.pay.transferTitle}</h1>
              <p className="mt-1 money text-3xl font-bold text-primary">{formatKip(total)}</p>
              <div className="mt-5 divide-y-2 rounded-2xl border-2 px-4">
                <CopyRow label={lo.pay.bank} value={bank.name} />
                <CopyRow label={lo.pay.accountName} value={bank.accountName} />
                <CopyRow label={lo.pay.accountNo} value={bank.accountNo} />
              </div>
              <div className="mt-5 grid place-items-center rounded-2xl border-2 border-dashed p-6 text-center text-muted-foreground">
                {bank.qrUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={bank.qrUrl}
                    alt={lo.pay.qrHint}
                    className="h-auto max-h-[60dvh] w-full max-w-72 rounded-xl object-contain"
                  />
                ) : (
                  <QrCode className="size-24" strokeWidth={1.4} aria-hidden />
                )}
                <p className="mt-2 text-sm font-semibold">{lo.pay.qrHint}</p>
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section>
              <h1 className="mt-2 text-2xl font-bold">{lo.pay.uploadTitle}</h1>
              <label
                className={cn(
                  "mt-5 flex cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed text-center transition-colors hover:bg-muted/60",
                  preview ? "p-2" : "min-h-56 p-6",
                )}
              >
                {preview ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="" className="max-h-80 rounded-xl object-contain" />
                    <span className="py-1 text-sm font-bold text-sky">{lo.pay.changeImage}</span>
                  </>
                ) : (
                  <>
                    <span className="grid size-16 place-items-center rounded-2xl bg-sky/15 text-sky">
                      <ImageUp className="size-8" strokeWidth={2.4} aria-hidden />
                    </span>
                    <span className="font-bold">{lo.pay.uploadCta}</span>
                    <span className="text-xs text-muted-foreground">{lo.pay.uploadTypes}</span>
                  </>
                )}
                <input
                  type="file"
                  accept={ACCEPTED.join(",")}
                  className="sr-only"
                  onChange={(e) => onFile(e.target.files?.[0])}
                />
              </label>
              <div className="mt-5 space-y-3">
                <Input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder={lo.pay.reference}
                  aria-label={lo.pay.reference}
                  maxLength={64}
                  className="h-12 rounded-2xl border-2 px-4"
                />
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={lo.pay.note}
                  aria-label={lo.pay.note}
                  maxLength={200}
                  className="h-12 rounded-2xl border-2 px-4"
                />
              </div>
            </section>
          ) : null}
        </main>
      )}

      {/* Bottom action bar / success sheet */}
      {options.length > 0 ? (
        <div
          className={cn(
            "fixed inset-x-0 bottom-0 z-20 border-t-2 bg-background pb-[env(safe-area-inset-bottom)]",
            done && "animate-slide-up border-transparent bg-status-paid-bg",
          )}
        >
          <div className="mx-auto max-w-xl px-4 py-4">
            {done ? (
              <div className="mb-4 flex items-center gap-3" role="status">
                <span className="grid size-10 place-items-center rounded-full bg-tile text-status-paid">
                  <CircleCheck className="size-7" strokeWidth={2.6} aria-hidden />
                </span>
                <div>
                  <p className="text-xl font-bold text-status-paid">{lo.pay.successTitle}</p>
                  <p className="text-sm font-semibold text-status-paid/90">
                    {lo.pay.successBody} · <span className="money">{formatKip(total)}</span>
                  </p>
                </div>
              </div>
            ) : null}
            <Button
              variant="chunky"
              size="xl"
              className="w-full"
              disabled={!done && (!canContinue || submitting)}
              onClick={done ? () => router.push("/dashboard") : onPrimary}
            >
              {done
                ? lo.pay.continue
                : submitting
                  ? lo.common.loading
                  : step < 2
                    ? lo.pay.next
                    : lo.pay.submit}
            </Button>
          </div>
        </div>
      ) : null}

      {burst ? (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-30 grid place-items-center">
          <span className="animate-pop-in text-6xl font-black text-gold drop-shadow-[0_4px_0_var(--streak)] [-webkit-text-stroke:3px_var(--streak)] [paint-order:stroke_fill]">
            {lo.pay.successBurst}
          </span>
        </div>
      ) : null}
    </div>
  );
}
