"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUp, QrCode, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { saveWeekQrAction } from "@/app/actions/committee";
import { SectionCard } from "@/components/committee/bits";
import { Button } from "@/components/ui/button";
import type { SettingsView } from "@/lib/data/types";
import { lo } from "@/lib/i18n/lo";
import { formatKip } from "@/lib/money";
import { MAX_WEEKS_PER_SLIP } from "@/lib/week";

const t = lo.committee.settings;
const ACCEPTED = "image/jpeg,image/png,image/webp";

function Slot({
  weeks,
  amount,
  url,
  hasQr,
}: {
  weeks: number;
  amount: number;
  url: string | null;
  hasQr: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function send(form: FormData, ok: string) {
    setBusy(true);
    const r = await saveWeekQrAction(form).catch(() => null);
    setBusy(false);
    if (!r || !r.ok) return void toast.error(r && !r.ok ? r.error : lo.errors.generic);
    toast.success(ok);
    router.refresh();
  }

  return (
    <li className="flex flex-col gap-2 rounded-2xl border-2 p-2.5">
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-sm font-bold">{t.weeksLabel(weeks)}</span>
        <span className="money text-xs font-bold text-primary">{formatKip(amount)}</span>
      </div>
      <div className="grid aspect-square place-items-center overflow-hidden rounded-xl bg-muted/50">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={`QR ${formatKip(amount)}`} className="size-full object-contain" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
            <QrCode className="size-8" strokeWidth={1.6} aria-hidden />
            {t.noQr}
          </span>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          const form = new FormData();
          form.set("weeks", String(weeks));
          form.set("qr", f);
          void send(form, t.qrSaved);
        }}
      />
      <div className="flex gap-1.5">
        <Button
          type="button"
          variant="tile"
          size="sm"
          className="h-9 flex-1 px-2"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          <ImageUp className="size-4" />{" "}
          {busy ? lo.common.loading : hasQr ? t.changeQr : t.uploadQr}
        </Button>
        {hasQr ? (
          <Button
            type="button"
            variant="tile"
            size="sm"
            className="h-9 px-2.5 text-destructive"
            disabled={busy}
            aria-label={t.removeQrShort}
            onClick={() => {
              const form = new FormData();
              form.set("weeks", String(weeks));
              form.set("remove", "1");
              void send(form, t.qrRemoved);
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        ) : null}
      </div>
    </li>
  );
}

/** Seven fixed-amount QR codes: 1 week … 7 weeks of the weekly fee. */
export function AmountQrManager({ settings }: { settings: SettingsView }) {
  return (
    <SectionCard title={t.amountQrTitle}>
      <p className="mb-3 text-sm text-muted-foreground">{t.amountQrHint}</p>
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: MAX_WEEKS_PER_SLIP }, (_, i) => i + 1).map((n) => (
          <Slot
            key={n}
            weeks={n}
            amount={n * settings.weeklyAmount}
            url={settings.qrByWeeks[n]?.url ?? null}
            hasQr={!!settings.qrByWeeks[n]}
          />
        ))}
      </ul>
    </SectionCard>
  );
}
