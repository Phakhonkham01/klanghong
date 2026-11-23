"use client";

import { useState } from "react";
import { Banknote } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatWeekRange } from "@/lib/format";
import { lo } from "@/lib/i18n/lo";
import type { IsoDate } from "@/lib/week";

const t = lo.committee.members;

/** Record cash received for one or more open weeks (demo: toast only). */
export function CashPaymentButton({
  weeks,
  studentName,
}: {
  weeks: IsoDate[];
  studentName: string;
}) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<IsoDate[]>([]);

  return (
    <>
      <Button
        variant="chunky"
        size="lg"
        className="h-11 px-4"
        disabled={weeks.length === 0}
        onClick={() => {
          setPicked(weeks.slice(0, 1));
          setOpen(true);
        }}
      >
        <Banknote className="size-5" /> {t.addCash}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-4 rounded-3xl p-5 sm:max-w-md">
          <div>
            <DialogTitle className="text-lg font-bold">{t.cashTitle}</DialogTitle>
            <DialogDescription>{studentName}</DialogDescription>
          </div>
          <p className="text-sm font-bold">{t.cashWeek}</p>
          <div className="flex flex-wrap gap-2">
            {weeks.map((w) => (
              <Button
                key={w}
                variant="tile"
                size="sm"
                className="h-9 px-3"
                aria-pressed={picked.includes(w)}
                onClick={() =>
                  setPicked((p) => (p.includes(w) ? p.filter((x) => x !== w) : [...p, w]))
                }
              >
                {formatWeekRange(w)}
              </Button>
            ))}
          </div>
          <Input
            defaultValue={lo.history.cash}
            aria-label={lo.history.note}
            className="h-11 rounded-2xl border-2 px-4"
          />
          <Button
            variant="chunky"
            size="xl"
            disabled={picked.length === 0}
            onClick={() => {
              toast.success(t.cashSaved);
              setOpen(false);
            }}
          >
            {lo.common.save}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
