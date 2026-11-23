import Link from "next/link";
import {
  ChevronRight,
  CircleCheck,
  Flame,
  KeyRound,
  LogOut,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { DarkModeRow } from "@/components/student/dark-mode-row";
import { demoPayments, demoSettings, demoStudent } from "@/lib/demo";
import { lo } from "@/lib/i18n/lo";
import { formatKip } from "@/lib/money";
import { buildStudentWeeks, computeStreak, summarizeOutstanding } from "@/lib/status";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: lo.nav.profile };

function StatCard({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: typeof Flame;
  value: string;
  label: string;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border-2 p-3">
      <Icon className={cn("size-7 shrink-0", tone)} strokeWidth={2.6} aria-hidden />
      <div className="min-w-0">
        <p className="truncate money text-lg leading-tight font-bold">{value}</p>
        <p className="truncate text-xs font-semibold text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

const rowClass =
  "flex w-full items-center gap-3 px-4 py-3.5 text-left font-bold transition-colors hover:bg-muted/60";

export default function Page() {
  const now = new Date();
  const payments = demoPayments(now);
  const entries = buildStudentWeeks(demoSettings.startDate, payments, now);
  const paidWeeks = entries.filter((e) => e.status === "paid").length;
  const paidTotal = payments
    .filter((p) => p.status === "approved")
    .reduce((s, p) => s + p.amount, 0);
  const outstanding = summarizeOutstanding(entries, demoSettings.weeklyAmount);
  const pct = entries.length ? Math.round((paidWeeks / entries.length) * 100) : 0;

  return (
    <div className="space-y-6 pt-2">
      {/* Identity header */}
      <section className="flex flex-col items-center gap-3 border-b-2 pb-6 text-center">
        <span className="grid size-24 press-3d place-items-center rounded-full bg-sky text-4xl font-black text-white [--press-depth:5px] [--press-shade:var(--sky-shade)]">
          {demoStudent.name.slice(0, 1)}
        </span>
        <div>
          <h1 className="text-2xl font-bold">{demoStudent.name}</h1>
          <p className="money text-sm font-semibold text-muted-foreground">{demoStudent.code}</p>
        </div>
        <span className="rounded-full bg-accent px-3 py-0.5 text-xs font-bold text-accent-foreground">
          {lo.profile.roleStudent}
        </span>
      </section>

      {/* Stats */}
      <section>
        <h2 className="mb-3 text-lg font-bold">{lo.profile.stats}</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={Flame}
            value={String(computeStreak(entries))}
            label={lo.stats.streak}
            tone="text-streak"
          />
          <StatCard
            icon={CircleCheck}
            value={String(paidWeeks)}
            label={lo.profile.weeksPaid}
            tone="text-status-paid"
          />
          <StatCard
            icon={Wallet}
            value={formatKip(paidTotal)}
            label={lo.stats.paidTotal}
            tone="text-sky"
          />
          <StatCard
            icon={TriangleAlert}
            value={String(outstanding.count)}
            label={lo.stats.outstanding}
            tone={outstanding.count ? "text-status-rejected" : "text-muted-foreground"}
          />
        </div>
      </section>

      {/* Progress */}
      <section className="rounded-2xl border-2 p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-bold">{lo.profile.progress}</h2>
          <span className="money text-sm font-bold text-primary">{pct}%</span>
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label={lo.profile.progress}
          className="mt-2 h-4 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="relative h-full rounded-full bg-primary after:absolute after:inset-x-2 after:top-1 after:h-1 after:rounded-full after:bg-white/30"
            style={{ width: `${Math.max(pct, 4)}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {lo.profile.progressLine(paidWeeks, entries.length)}
        </p>
      </section>

      {/* Account */}
      <section>
        <h2 className="mb-3 text-lg font-bold">{lo.profile.account}</h2>
        <div className="divide-y-2 overflow-hidden rounded-2xl border-2">
          <DarkModeRow className={rowClass} />
          <Link href="/change-password" className={rowClass}>
            <KeyRound className="size-5 text-sky" strokeWidth={2.6} aria-hidden />
            <span className="flex-1">{lo.profile.changePassword}</span>
            <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
          </Link>
          <Link href="/login" className={cn(rowClass, "text-destructive")}>
            <LogOut className="size-5" strokeWidth={2.6} aria-hidden />
            <span className="flex-1">{lo.nav.logout}</span>
          </Link>
        </div>
      </section>

      <p className="text-center text-xs text-muted-foreground">
        {lo.app.name} · {lo.profile.version} 0.1.0 · {lo.dashboard.demo}
      </p>
    </div>
  );
}
