"use client";

import { useEffect, useMemo, useState } from "react";
import { ImageUp, Info, Landmark, QrCode, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "@/components/committee/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { demoSettings } from "@/lib/demo";
import { formatDateLo } from "@/lib/format";
import { lo } from "@/lib/i18n/lo";
import { parseKip } from "@/lib/money";
import { isIsoDate, weekStartOf } from "@/lib/week";

const t = lo.committee.settings;
const field = "h-11 rounded-2xl border-2 px-4 text-base md:text-sm";
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-bold">
        {label}
      </Label>
      {children}
    </div>
  );
}

export function SettingsForm({ initial }: { initial: typeof demoSettings }) {
  const [amount, setAmount] = useState(String(initial.weeklyAmount));
  const [startDate, setStartDate] = useState(initial.startDate);
  const [qr, setQr] = useState<File | null>(null);
  const qrUrl = useMemo(() => (qr ? URL.createObjectURL(qr) : null), [qr]);
  useEffect(() => () => void (qrUrl && URL.revokeObjectURL(qrUrl)), [qrUrl]);

  const amountChanged = parseKip(amount) !== initial.weeklyAmount;

  return (
    <form
      className="mx-auto max-w-2xl space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        const n = parseKip(amount);
        if (!n || n <= 0) return void toast.error(t.invalidAmount);
        toast.success(t.saved);
      }}
    >
      <h1 className="text-2xl font-bold">{t.title}</h1>

      <SectionCard title={t.fee}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="amount" label={t.weeklyAmount}>
            <div className="relative">
              <Wallet className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="numeric"
                className={`${field} pl-10 money`}
              />
            </div>
          </Field>
          <Field id="start" label={t.startDate}>
            <Input
              id="start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={field}
            />
            {isIsoDate(startDate) ? (
              <p className="text-xs text-muted-foreground">
                {t.startHint(formatDateLo(weekStartOf(startDate)))}
              </p>
            ) : null}
          </Field>
        </div>
        {amountChanged ? (
          <p className="mt-4 flex items-start gap-2 rounded-2xl bg-status-pending-bg p-3 text-sm font-semibold text-status-pending">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden /> {t.amountWarning}
          </p>
        ) : null}
      </SectionCard>

      <SectionCard title={t.bank}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="bank" label={t.bankName}>
            <div className="relative">
              <Landmark className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="bank" defaultValue={initial.bankName} className={`${field} pl-10`} />
            </div>
          </Field>
          <Field id="accname" label={t.accountName}>
            <Input id="accname" defaultValue={initial.accountName} className={field} />
          </Field>
          <Field id="accno" label={t.accountNo}>
            <Input
              id="accno"
              defaultValue={initial.accountNo}
              inputMode="numeric"
              className={`${field} money`}
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title={t.qr}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid size-36 place-items-center overflow-hidden rounded-2xl border-2 border-dashed text-muted-foreground">
            {qrUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrUrl} alt={t.qr} className="size-full object-contain" />
            ) : (
              <QrCode className="size-16" strokeWidth={1.4} aria-hidden />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="inline-flex">
              <span className="inline-flex h-10 press-3d cursor-pointer items-center gap-2 rounded-2xl border-2 border-tile-shade bg-tile px-4 text-sm font-semibold [--press-depth:3px] hover:bg-muted">
                <ImageUp className="size-4" /> {t.qrUpload}
              </span>
              <input
                type="file"
                accept={ACCEPTED.join(",")}
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f && !ACCEPTED.includes(f.type)) return void toast.error(lo.pay.invalidType);
                  if (f) setQr(f);
                }}
              />
            </label>
            {qr ? (
              <Button
                type="button"
                variant="ghost"
                className="justify-start text-destructive"
                onClick={() => setQr(null)}
              >
                <Trash2 /> {t.qrRemove}
              </Button>
            ) : null}
          </div>
        </div>
      </SectionCard>

      <SectionCard title={t.note}>
        <Textarea
          aria-label={t.note}
          maxLength={300}
          className="min-h-24 rounded-2xl border-2 p-3 text-base md:text-sm"
        />
      </SectionCard>

      <Button type="submit" variant="chunky" size="xl" className="w-full">
        {t.save}
      </Button>
    </form>
  );
}
