import { CircleCheck, Flame, PiggyBank, TriangleAlert, type LucideIcon } from "lucide-react";
import { lo } from "@/lib/i18n/lo";
import { formatKipLao } from "@/lib/money";
import { cn } from "@/lib/utils";

function Stat({
  icon: Icon,
  value,
  label,
  className,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
  className: string;
}) {
  return (
    <div className="flex items-center gap-1 sm:gap-1.5" title={label}>
      <Icon className={cn("size-6 shrink-0", className)} strokeWidth={2.6} aria-hidden />
      <span className={cn("money text-sm font-bold whitespace-nowrap sm:text-base", className)}>
        {value}
      </span>
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function StatBar({
  streak,
  paidTotal,
  outstanding,
  fund,
}: {
  streak: number;
  paidTotal: number;
  outstanding: number;
  fund: number;
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-1 py-2">
      <Stat icon={Flame} value={String(streak)} label={lo.stats.streak} className="text-streak" />
      <Stat
        icon={CircleCheck}
        value={formatKipLao(paidTotal)}
        label={lo.stats.paidTotal}
        className="text-status-paid"
      />
      <Stat
        icon={TriangleAlert}
        value={String(outstanding)}
        label={lo.stats.outstanding}
        className={outstanding ? "text-status-rejected" : "text-muted-foreground"}
      />
      <Stat
        icon={PiggyBank}
        value={formatKipLao(fund)}
        label={lo.stats.fund}
        className="text-sky"
      />
    </div>
  );
}
