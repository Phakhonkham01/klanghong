"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Info, Landmark, Wallet } from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "@/components/committee/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveSettingsAction } from "@/app/actions/committee";
import type { SettingsView } from "@/lib/data/types";
import { formatDateLo } from "@/lib/format";
import { lo } from "@/lib/i18n/lo";
import { parseKip } from "@/lib/money";
import { isIsoDate, weekStartOf } from "@/lib/week";

const t = lo.committee.settings;
const field = "h-11 rounded-2xl border-2 px-4 text-base md:text-sm";

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

export function SettingsForm({
  initial,
  qrSection,
}: {
  initial: SettingsView;
  qrSection?: React.ReactNode;
}) {
  const [amount, setAmount] = useState(String(initial.weeklyAmount));
  const [startDate, setStartDate] = useState(initial.startDate);
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const amountChanged = parseKip(amount) !== initial.weeklyAmount;

  return (
    <form
      className="mx-auto max-w-2xl space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const n = parseKip(amount);
        if (!n || n <= 0) return void toast.error(t.invalidAmount);
        const form = new FormData(e.currentTarget);
        setSaving(true);
        const r = await saveSettingsAction(form).catch(() => null);
        setSaving(false);
        if (!r || !r.ok) return void toast.error(r && !r.ok ? r.error : lo.errors.generic);
        toast.success(t.savedReal);
        router.refresh();
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
                name="weeklyAmount"
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
              name="startDate"
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
              <Input
                id="bank"
                name="bankName"
                maxLength={60}
                defaultValue={initial.bankName}
                className={`${field} pl-10`}
              />
            </div>
          </Field>
          <Field id="accname" label={t.accountName}>
            <Input
              id="accname"
              name="accountName"
              maxLength={80}
              defaultValue={initial.accountName}
              className={field}
            />
          </Field>
          <Field id="accno" label={t.accountNo}>
            <Input
              id="accno"
              name="accountNo"
              maxLength={40}
              defaultValue={initial.accountNo}
              inputMode="numeric"
              className={`${field} money`}
            />
          </Field>
        </div>
      </SectionCard>

      {/* Fixed-amount QR codes (1–7 weeks) replace the old any-amount QR. */}
      {qrSection}

      <SectionCard title={t.note}>
        <Textarea
          name="note"
          defaultValue={initial.note}
          aria-label={t.note}
          maxLength={300}
          className="min-h-24 rounded-2xl border-2 p-3 text-base md:text-sm"
        />
      </SectionCard>

      <Button type="submit" variant="chunky" size="xl" className="w-full" disabled={saving}>
        {saving ? lo.common.loading : t.save}
      </Button>
    </form>
  );
}
