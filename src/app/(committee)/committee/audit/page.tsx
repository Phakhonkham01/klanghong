import { Check, Coins, Receipt, RotateCcw, Settings, type LucideIcon } from "lucide-react";
import { demoAllPayments, demoAudit, type DemoAudit } from "@/lib/demo-committee";
import { formatDateTimeLo } from "@/lib/format";
import { lo } from "@/lib/i18n/lo";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: lo.nav.audit };

const icons: Record<DemoAudit["action"], { icon: LucideIcon; tone: string }> = {
  approve: { icon: Check, tone: "bg-status-paid text-white" },
  reject: { icon: RotateCcw, tone: "bg-status-rejected text-white" },
  expense_create: { icon: Receipt, tone: "bg-sky text-white" },
  settings_update: { icon: Settings, tone: "bg-muted-foreground text-white" },
  cash_payment: { icon: Coins, tone: "bg-status-paid text-white" },
};

export default function Page() {
  const entries = demoAudit(demoAllPayments(new Date()));
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{lo.committee.audit.title}</h1>
      <ol className="relative space-y-3 before:absolute before:top-2 before:bottom-2 before:left-[1.1rem] before:w-0.5 before:bg-border">
        {entries.map((a) => {
          const { icon: Icon, tone } = icons[a.action];
          return (
            <li key={a.id} className="relative flex items-start gap-3">
              <span
                className={cn(
                  "z-10 grid size-9 shrink-0 place-items-center rounded-full ring-4 ring-background",
                  tone,
                )}
              >
                <Icon className="size-4" strokeWidth={2.8} aria-hidden />
              </span>
              <div className="min-w-0 flex-1 rounded-2xl border-2 px-3 py-2">
                <p className="text-sm font-bold">{lo.committee.audit.actions[a.action]}</p>
                <p className="truncate text-sm">{a.detail}</p>
                <p className="text-xs text-muted-foreground">
                  {a.actor} · {formatDateTimeLo(a.created_at)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
