"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Download, Search, Users } from "lucide-react";
import { nodeStyle } from "@/components/student/status-style";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { downloadCsv } from "@/lib/csv";
import { formatDateLo } from "@/lib/format";
import { lo } from "@/lib/i18n/lo";
import type { MemberRow } from "@/lib/members";
import { formatKip } from "@/lib/money";
import type { WeekStatus } from "@/lib/status";
import type { IsoDate } from "@/lib/week";
import { cn } from "@/lib/utils";

type Filter = "all" | "overdue" | "unpaid";
const t = lo.committee.members;
const PAGE = 8;
const LEGEND: WeekStatus[] = ["paid", "pending", "rejected", "unpaid", "overdue"];

/** Matrix cells use neutral slate for "unpaid" so it never reads as "paid". */
function cellStyle(status: WeekStatus) {
  const base = nodeStyle[status];
  return status === "unpaid" ? { ...base, className: "bg-status-unpaid text-white" } : base;
}

function Cell({ status, label }: { status: WeekStatus; label: string }) {
  const { className, icon: Icon } = cellStyle(status);
  return (
    <span
      title={label}
      className={cn("mx-auto grid size-8 place-items-center rounded-lg", className)}
    >
      <Icon className="size-4" strokeWidth={3} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function MembersMatrix({
  weeks,
  rows,
  initialFilter,
}: {
  weeks: IsoDate[];
  rows: MemberRow[];
  initialFilter: Filter;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>(initialFilter);
  // `end` is the exclusive index of the last visible week; default shows the latest PAGE weeks.
  const [end, setEnd] = useState(weeks.length);
  const start = Math.max(0, end - PAGE);
  const visible = weeks.slice(start, end);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q) && !r.code.toLowerCase().includes(q)) return false;
      if (filter === "overdue") return r.overdueCount > 0;
      if (filter === "unpaid")
        return r.currentStatus === "unpaid" || r.currentStatus === "rejected";
      return true;
    });
  }, [rows, query, filter]);

  const counts = {
    all: rows.length,
    overdue: rows.filter((r) => r.overdueCount > 0).length,
    unpaid: rows.filter((r) => r.currentStatus === "unpaid" || r.currentStatus === "rejected")
      .length,
  };

  function exportCsv() {
    downloadCsv("klanghong-members.csv", [
      [
        lo.committee.students.code,
        lo.committee.students.name,
        ...weeks,
        t.totalPaid,
        t.overdueWeeks,
      ],
      ...filtered.map((r) => [
        r.code,
        r.name,
        ...r.statuses.map((s) => lo.status[s]),
        r.totalPaid,
        r.overdueCount,
      ]),
    ]);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <Button variant="tile" className="h-10 px-4" onClick={exportCsv}>
          <Download className="size-4" /> {lo.common.exportCsv}
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.search}
            aria-label={t.search}
            className="h-11 rounded-2xl border-2 pl-10 text-base md:text-sm"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto" role="group">
          {(["all", "overdue", "unpaid"] as const).map((f) => (
            <Button
              key={f}
              variant="tile"
              className="h-10 shrink-0 px-3.5"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? t.all : f === "overdue" ? t.overdue : t.unpaidThisWeek}
              <span className="money text-xs opacity-70">{counts[f]}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Legend + week pager */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ul
          className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-muted-foreground"
          aria-label={t.legend}
        >
          {LEGEND.map((s) => (
            <li key={s} className="flex items-center gap-1.5">
              <span className={cn("size-3 rounded", cellStyle(s).className)} aria-hidden />
              {lo.status[s]}
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            disabled={start === 0}
            onClick={() => setEnd((e) => Math.max(PAGE, e - PAGE))}
            aria-label={t.older}
          >
            <ChevronLeft />
          </Button>
          <span className="text-xs font-bold whitespace-nowrap text-muted-foreground">
            {visible[0] ? formatDateLo(visible[0], false) : ""} –{" "}
            {visible.at(-1) ? formatDateLo(visible.at(-1)!, false) : ""}
          </span>
          <Button
            variant="ghost"
            size="icon"
            disabled={end >= weeks.length}
            onClick={() => setEnd((e) => Math.min(weeks.length, e + PAGE))}
            aria-label={t.newer}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed py-14 text-muted-foreground">
          <Users className="size-10" strokeWidth={1.6} aria-hidden />
          <p className="font-bold">{t.noMatch}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border-2">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 bg-muted/40">
                <th
                  scope="col"
                  className="sticky left-0 z-10 min-w-44 bg-muted px-3 py-2.5 text-left font-bold"
                >
                  {t.student}
                </th>
                {visible.map((w, i) => (
                  <th
                    key={w}
                    scope="col"
                    className={cn(
                      "px-1 py-2.5 text-center text-xs font-bold whitespace-nowrap text-muted-foreground",
                      start + i === weeks.length - 1 && "text-sky",
                    )}
                  >
                    {formatDateLo(w, false)}
                  </th>
                ))}
                <th scope="col" className="px-3 py-2.5 text-right font-bold whitespace-nowrap">
                  {t.totalPaid}
                </th>
                <th scope="col" className="px-3 py-2.5 text-center font-bold whitespace-nowrap">
                  {t.overdueWeeks}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => router.push(`/committee/members/${r.id}`)}
                  className="group cursor-pointer border-b last:border-b-0 hover:bg-muted/50"
                >
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-background px-3 py-2 text-left group-hover:bg-muted"
                  >
                    <Link
                      href={`/committee/members/${r.id}`}
                      className="block font-bold hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {r.name}
                    </Link>
                    <span className="money text-xs font-normal text-muted-foreground">
                      {r.code}
                    </span>
                  </th>
                  {r.statuses.slice(start, end).map((s, i) => (
                    <td key={visible[i]} className="px-1 py-2">
                      <Cell
                        status={s}
                        label={`${formatDateLo(visible[i]!, false)} · ${lo.status[s]}`}
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right money font-bold whitespace-nowrap">
                    {formatKip(r.totalPaid)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {r.overdueCount ? (
                      <span className="rounded-full bg-status-overdue-bg px-2 py-0.5 money text-xs font-bold text-status-overdue">
                        {r.overdueCount}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">–</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
