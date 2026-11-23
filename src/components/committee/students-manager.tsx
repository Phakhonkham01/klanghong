"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  createStudentAction,
  importStudentsAction,
  resetPasswordAction,
  setActiveAction,
  type CreatedAccount,
} from "@/app/actions/students";
import { downloadCsv } from "@/lib/csv";
import type { ActionResult, StudentView } from "@/lib/data/types";
import { lo } from "@/lib/i18n/lo";
import { cn } from "@/lib/utils";

const t = lo.committee.students;
const CODE_RE = /^[A-Za-z0-9]{3,20}$/;
const field = "h-11 rounded-2xl border-2 px-4 text-base md:text-sm";

export function StudentsManager({ initial }: { initial: StudentView[] }) {
  const router = useRouter();
  const students = initial;
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [bulk, setBulk] = useState("");
  const [busy, setBusy] = useState(false);
  const [credentials, setCredentials] = useState<CreatedAccount[] | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? students.filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q))
      : students;
  }, [students, query]);

  async function run<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T> | null> {
    setBusy(true);
    try {
      const r = await fn();
      if (!r.ok) toast.error(r.error);
      return r;
    } catch {
      toast.error(lo.errors.generic);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function add() {
    if (!CODE_RE.test(code.replace(/\s+/g, "").toUpperCase()))
      return void toast.error(t.invalidCode);
    if (!name.trim()) return void toast.error(t.nameRequired);
    const r = await run(() => createStudentAction(code, name));
    if (r?.ok) {
      toast.success(t.added);
      setCode("");
      setName("");
      setAdding(false);
      setCredentials([r.data]);
      router.refresh();
    }
  }

  async function importBulk() {
    const r = await run(() => importStudentsAction(bulk));
    if (r?.ok) {
      toast.success(t.imported(r.data.created.length));
      if (r.data.skipped) toast.warning(t.importSkipped(r.data.skipped));
      setBulk("");
      setImporting(false);
      if (r.data.created.length) setCredentials(r.data.created);
      router.refresh();
    }
  }

  async function resetPassword(id: string) {
    const r = await run(() => resetPasswordAction(id));
    if (r?.ok) {
      toast.success(t.resetDone(r.data.code));
      setCredentials([r.data]);
      router.refresh();
    }
  }

  async function toggleActive(id: string, active: boolean) {
    const r = await run(() => setActiveAction(id, active));
    if (r?.ok) router.refresh();
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

      {filtered.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed py-14 text-center text-muted-foreground">
          {students.length === 0 ? t.empty : lo.committee.members.noMatch}
        </p>
      ) : null}

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
            {s.mustChangePassword && s.isActive ? (
              <span className="hidden rounded-full bg-status-pending-bg px-2.5 py-0.5 text-xs font-bold text-status-pending sm:inline">
                {t.mustChange}
              </span>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="icon" aria-label={t.actions} />}
              >
                <MoreHorizontal />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-48">
                <DropdownMenuItem disabled={busy} onClick={() => resetPassword(s.id)}>
                  <KeyRound /> {t.resetPassword}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={busy}
                  onClick={() => toggleActive(s.id, !s.isActive)}
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
          <Button variant="chunky" size="xl" className="mt-2" disabled={busy} onClick={add}>
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
          <Button variant="chunky" size="xl" disabled={!bulk.trim() || busy} onClick={importBulk}>
            {t.importCta}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={credentials !== null} onOpenChange={(o) => !o && setCredentials(null)}>
        <DialogContent className="max-h-[85dvh] gap-3 overflow-y-auto rounded-3xl p-5 sm:max-w-md">
          <DialogTitle className="text-lg font-bold">{t.tempPasswordTitle}</DialogTitle>
          <DialogDescription>{t.tempPasswordHint}</DialogDescription>
          <ul className="divide-y-2 rounded-2xl border-2">
            {credentials?.map((c) => (
              <li key={c.code} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="min-w-0">
                  <span className="block money font-bold">{c.code}</span>
                  <span className="block truncate text-xs text-muted-foreground">{c.name}</span>
                </span>
                <code className="rounded-lg bg-muted px-2 py-1 money text-base font-bold select-all">
                  {c.password}
                </code>
              </li>
            ))}
          </ul>
          <Button
            variant="tile"
            size="xl"
            onClick={() =>
              downloadCsv("klanghong-temp-passwords.csv", [
                [t.code, t.name, t.tempPasswordTitle],
                ...(credentials ?? []).map((c) => [c.code, c.name, c.password]),
              ])
            }
          >
            {t.downloadPasswords}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
