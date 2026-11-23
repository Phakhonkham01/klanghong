"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SectionCard } from "@/components/committee/bits";
import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/csv";
import { formatDateLo } from "@/lib/format";
import { lo } from "@/lib/i18n/lo";
import { formatKip, formatKipCompact } from "@/lib/money";
import { cn } from "@/lib/utils";

export type ReportRow = {
  key: string;
  label: string;
  collected: number;
  expected: number;
  outstanding: number;
};

const t = lo.committee.reports;

function rate(r: ReportRow) {
  return r.expected ? Math.round((r.collected / r.expected) * 100) : 0;
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ReportRow }[];
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="rounded-xl border-2 bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-bold">{row.label}</p>
      <p className="money">
        {t.collected}: <b>{formatKip(row.collected)}</b>
      </p>
      <p className="money text-muted-foreground">
        {t.expected}: {formatKip(row.expected)} · {rate(row)}%
      </p>
    </div>
  );
}

export function ReportsView({
  weekly,
  monthly,
  weeklyExpected,
}: {
  weekly: ReportRow[];
  monthly: ReportRow[];
  weeklyExpected: number;
}) {
  const [mode, setMode] = useState<"week" | "month">("week");
  const rows = mode === "week" ? weekly : monthly;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <Button
          variant="tile"
          className="h-10 px-4"
          onClick={() =>
            downloadCsv(`klanghong-report-${mode}.csv`, [
              [t.period, t.collected, t.expected, t.outstanding, t.rate],
              ...rows.map((r) => [r.label, r.collected, r.expected, r.outstanding, `${rate(r)}%`]),
            ])
          }
        >
          <Download className="size-4" /> {lo.common.exportCsv}
        </Button>
      </div>

      <SectionCard title={t.chartLabel}>
        <div className="h-64 w-full" role="img" aria-label={t.chartLabel}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={weekly}
              margin={{ top: 16, right: 8, bottom: 0, left: 0 }}
              barCategoryGap={6}
            >
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="key"
                tickFormatter={(v: string) => formatDateLo(v, false)}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
              />
              <YAxis
                tickFormatter={(v: number) => formatKipCompact(v)}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={44}
                domain={[
                  0,
                  (max: number) =>
                    Math.ceil((Math.max(max, weeklyExpected) * 1.1) / 10_000) * 10_000,
                ]}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.6 }} />
              <ReferenceLine
                y={weeklyExpected}
                stroke="var(--muted-foreground)"
                strokeDasharray="4 4"
                label={{
                  value: `${t.expected} ${formatKipCompact(weeklyExpected)}`,
                  position: "insideTopRight",
                  fill: "var(--muted-foreground)",
                  fontSize: 11,
                }}
              />
              <Bar
                dataKey="collected"
                name={t.collected}
                fill="var(--primary)"
                radius={[4, 4, 0, 0]}
                maxBarSize={36}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <div className="flex gap-2" role="group">
        {(["week", "month"] as const).map((m) => (
          <Button
            key={m}
            variant="tile"
            className="h-10 px-4"
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
          >
            {m === "week" ? t.byWeek : t.byMonth}
          </Button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 bg-muted/40 text-left">
              <th scope="col" className="px-3 py-2.5 font-bold">
                {t.period}
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-bold whitespace-nowrap">
                {t.collected}
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-bold whitespace-nowrap">
                {t.expected}
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-bold whitespace-nowrap">
                {t.outstanding}
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-bold whitespace-nowrap">
                {t.rate}
              </th>
            </tr>
          </thead>
          <tbody>
            {[...rows].reverse().map((r) => (
              <tr key={r.key} className="border-b last:border-b-0">
                <th scope="row" className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">
                  {r.label}
                </th>
                <td className="px-3 py-2.5 text-right money font-bold">{formatKip(r.collected)}</td>
                <td className="px-3 py-2.5 text-right money text-muted-foreground">
                  {formatKip(r.expected)}
                </td>
                <td
                  className={cn(
                    "px-3 py-2.5 text-right money",
                    r.outstanding > 0 && "font-bold text-status-overdue",
                  )}
                >
                  {formatKip(r.outstanding)}
                </td>
                <td className="px-3 py-2.5 text-right money">{rate(r)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
