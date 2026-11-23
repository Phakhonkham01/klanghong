"use client";

import { useMemo, useState } from "react";
import { KeyRound, MoreHorizontal, Power, Search, Upload, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { DemoStudent } from "@/lib/demo-committee";
import { lo } from "@/lib/i18n/lo";
import { cn } from "@/lib/utils";

const t = lo.committee.students;
const CODE_RE = /^[A-Za-z0-9]{3,20}$/;
const field = "h-11 rounded-2xl border-2 px-4 text-base md:text-sm";

export function StudentsManager({ initial }: { initial: DemoStudent[] }) {
  const [students, setStudents] = useState(initial);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [bulk, setBulk] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? students.filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q))
      : students;
  }, [students, query]);

  const codes = new Set(students.map((s) => s.code.toUpperCase()));

  function add() {
    const c = code.trim().toUpperCase();
    if (!CODE_RE.test(c)) return void toast.error(t.invalidCode);
    if (codes.has(c)) return void toast.error(t.duplicateCode);
    if (!name.trim()) return void toast.error(t.nameRequired);
    setStudents((s) => [
      ...s,
      { id: `new-${c}`, code: c, name: name.trim(), phone: null, isActive: true, role: "student" },
    ]);
    toast.success(t.added);
    setCode("");
    setName("");
    setAdding(false);
  }

  function importBulk() {
    const seen = new Set(codes);
    const rows: DemoStudent[] = [];
    for (const line of bulk.split(/\r?\n/)) {
      const [rawCode, ...rest] = line.split(",");
      const c = rawCode?.trim().toUpperCase() ?? "";
      const n = rest.join(",").trim();
      if (!CODE_RE.test(c) || !n || seen.has(c)) continue;
      seen.add(c);
      rows.push({ id: `new-${c}`, code: c, name: n, phone: null, isActive: true, role: "student" });
    }
    setStudents((s) => [...s, ...rows]);
    toast.success(t.imported(rows.length));
    setBulk("");
    setImporting(false);
  }

  function toggleActive(id: string) {
    setStudents((s) => s.map((x) => (x.id === id ? { ...x, isActive: !x.isActive } : x)));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.count(students.length)}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="tile" className="h-11 px-4" onClick={() => setImporting(true)}>
            <Upload className="size-4" /> {t.import}
          </Button>
          <Button variant="chunky" className="h-11 px-4" onClick={() => setAdding(true)}>
            <UserPlus className="size-4" /> {t.add}
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={lo.committee.members.search}
          aria-label={lo.committee.members.search}
          className={cn(field, "pl-10")}
        />
      </div>

      <ul className="divide-y-2 overflow-hidden rounded-2xl border-2">
        {filtered.map((s) => (
          <li
            key={s.id}
            className={cn("flex items-center gap-3 px-4 py-3", !s.isActive && "opacity-55")}
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sky/15 font-black text-sky">
              {s.name.replace(/^ນາງ /, "").slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{s.name}</p>
              <p className="money text-xs text-muted-foreground">
                {s.code}
                {s.phone ? ` · ${s.phone}` : ""}
              </p>
            </div>
            {s.role === "committee" ? (
              <span className="hidden rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-foreground sm:inline">
                {t.roleCommittee}
              </span>
            ) : null}
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-bold",
                s.isActive
                  ? "bg-status-paid-bg text-status-paid"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {s.isActive ? t.active : t.inactive}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="icon" aria-label={t.actions} />}
              >
                <MoreHorizontal />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-48">
                <DropdownMenuItem onClick={() => toast.success(t.resetDone(s.code))}>
                  <KeyRound /> {t.resetPassword}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => toggleActive(s.id)}
                  variant={s.isActive ? "destructive" : "default"}
                >
                  <Power /> {s.isActive ? t.deactivate : t.activate}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        ))}
      </ul>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="gap-3 rounded-3xl p-5 sm:max-w-md">
          <DialogTitle className="text-lg font-bold">{t.add}</DialogTitle>
          <DialogDescription className="sr-only">{t.add}</DialogDescription>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t.code}
            aria-label={t.code}
            maxLength={20}
            className={field}
          />
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.name}
            aria-label={t.name}
            maxLength={80}
            className={field}
          />
          <Button variant="chunky" size="xl" className="mt-2" onClick={add}>
            {lo.common.save}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={importing} onOpenChange={setImporting}>
        <DialogContent className="gap-3 rounded-3xl p-5 sm:max-w-md">
          <DialogTitle className="text-lg font-bold">{t.import}</DialogTitle>
          <DialogDescription>{t.importHint}</DialogDescription>
          <Textarea
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            placeholder={"IT2026101,ສົມສັກ ໄຊຍະວົງ\nIT2026102,ນາງ ແກ້ວ ພົມມະລາ"}
            aria-label={t.import}
            className="min-h-36 rounded-2xl border-2 p-3 money"
          />
          <Button variant="chunky" size="xl" disabled={!bulk.trim()} onClick={importBulk}>
            {t.importCta}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
