"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  KeyRound,
  MoreHorizontal,
  Power,
  RotateCcw,
  Search,
  Upload,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  createStudentAction,
  decideRegistrationAction,
  importStudentsAction,
  resetOtpQuotaAction,
  resetPasswordAction,
  setActiveAction,
  type CreatedAccount,
} from "@/app/actions/students";
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
import { isMember, type ActionResult, type StudentView } from "@/lib/data/types";
import { lo } from "@/lib/i18n/lo";
import { OTP } from "@/lib/otp-policy";
import { formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

const t = lo.committee.students;
const field = "h-11 rounded-2xl border-2 px-4 text-base md:text-sm";
type Tab = "pending" | "members" | "inactive";

function tabOf(s: StudentView): Tab {
  if (s.approval === "pending" && s.isActive) return "pending";
  return isMember(s) ? "members" : "inactive";
}

export function StudentsManager({ initial }: { initial: StudentView[] }) {
  const router = useRouter();
  const students = initial;
  const [tab, setTab] = useState<Tab>(() =>
    initial.some((s) => tabOf(s) === "pending") ? "pending" : "members",
  );
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [bulk, setBulk] = useState("");
  const [busy, setBusy] = useState(false);
  const [credentials, setCredentials] = useState<CreatedAccount | null>(null);

  const counts = useMemo(() => {
    const c = { pending: 0, members: 0, inactive: 0 };
    for (const s of students) c[tabOf(s)]++;
    return c;
  }, [students]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, "").replace(/^0/, "");
    return students.filter((s) => {
      if (tabOf(s) !== tab) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        (s.code ?? "").toLowerCase().includes(q) ||
        (!!qDigits && (s.phone ?? "").includes(qDigits))
      );
    });
  }, [students, query, tab]);

  async function run<T>(
    fn: () => Promise<ActionResult<T>>,
    ok?: string,
  ): Promise<ActionResult<T> | null> {
    setBusy(true);
    try {
      const r = await fn();
      if (!r.ok) toast.error(r.error);
      else {
        if (ok) toast.success(ok);
        router.refresh();
      }
      return r;
    } catch {
      toast.error(lo.errors.generic);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function add() {
    const r = await run(() => createStudentAction(phone, name), t.addedPhone);
    if (r?.ok) {
      setPhone("");
      setName("");
      setAdding(false);
    }
  }

  async function importBulk() {
    const r = await run(() => importStudentsAction(bulk));
    if (r?.ok) {
      toast.success(t.importedPhone(r.data.created));
      if (r.data.skipped) toast.warning(t.importSkipped(r.data.skipped));
      setBulk("");
      setImporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.count(counts.members)}</p>
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

      <div className="flex gap-2 overflow-x-auto pb-1" role="group">
        {(["pending", "members", "inactive"] as const).map((k) => (
          <Button
            key={k}
            variant="tile"
            className="h-10 shrink-0 px-3.5"
            aria-pressed={tab === k}
            onClick={() => setTab(k)}
          >
            {k === "pending" ? t.tabPending : k === "members" ? t.tabMembers : t.tabInactive}
            <span
              className={cn(
                "rounded-full px-1.5 money text-xs",
                k === "pending" && counts.pending
                  ? "bg-status-pending-bg text-status-pending"
                  : "opacity-70",
              )}
            >
              {counts[k]}
            </span>
          </Button>
        ))}
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
          {tab === "pending"
            ? t.pendingEmpty
            : students.length === 0
              ? t.empty
              : lo.committee.members.noMatch}
        </p>
      ) : (
        <ul className="divide-y-2 overflow-hidden rounded-2xl border-2">
          {filtered.map((s) => {
            const otpUsed = s.otpUsed ?? 0;
            return (
              <li
                key={s.id}
                className={cn(
                  "flex flex-wrap items-center gap-3 px-4 py-3",
                  !s.isActive && "opacity-60",
                )}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sky/15 font-black text-sky">
                  {(s.name.replace(/^ນາງ /, "") || "?").slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn("truncate font-bold", !s.name && "text-muted-foreground italic")}
                  >
                    {s.name || t.noName}
                  </p>
                  <p className="truncate money text-xs text-muted-foreground">
                    {[s.phone ? formatPhone(s.phone) : null, s.code].filter(Boolean).join(" · ")}
                    {s.phone ? (
                      <span
                        className={cn(
                          "ml-2",
                          otpUsed >= OTP.monthlyLimit && "font-bold text-status-rejected",
                        )}
                      >
                        {t.otpUsed(otpUsed)}
                      </span>
                    ) : null}
                  </p>
                </div>
                {s.role === "committee" ? (
                  <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-foreground">
                    {t.roleCommittee}
                  </span>
                ) : null}
                {s.approval === "rejected" ? (
                  <span className="rounded-full bg-status-rejected-bg px-2.5 py-0.5 text-xs font-bold text-status-rejected">
                    {lo.status.rejected}
                  </span>
                ) : !s.isActive ? (
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
                    {t.inactive}
                  </span>
                ) : null}

                {tab === "pending" ? (
                  <div className="flex gap-2">
                    <Button
                      variant="chunky-danger"
                      size="sm"
                      className="h-9 px-3"
                      disabled={busy}
                      onClick={() =>
                        run(() => decideRegistrationAction(s.id, "rejected"), t.rejectedToast)
                      }
                    >
                      <X className="size-4" /> {t.reject}
                    </Button>
                    <Button
                      variant="chunky"
                      size="sm"
                      className="h-9 px-3"
                      disabled={busy || s.mustSetName}
                      title={s.mustSetName ? t.noName : undefined}
                      onClick={() =>
                        run(() => decideRegistrationAction(s.id, "approved"), t.approvedToast)
                      }
                    >
                      <Check className="size-4" /> {t.approve}
                    </Button>
                  </div>
                ) : null}

                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<Button variant="ghost" size="icon" aria-label={t.actions} />}
                  >
                    <MoreHorizontal />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-52">
                    {s.approval === "rejected" ? (
                      <DropdownMenuItem
                        disabled={busy}
                        onClick={() =>
                          run(() => decideRegistrationAction(s.id, "approved"), t.approvedToast)
                        }
                      >
                        <Check /> {t.approve}
                      </DropdownMenuItem>
                    ) : null}
                    {s.phone ? (
                      <DropdownMenuItem
                        disabled={busy}
                        onClick={() => run(() => resetOtpQuotaAction(s.id), t.resetOtpDone)}
                      >
                        <RotateCcw /> {t.resetOtp}
                      </DropdownMenuItem>
                    ) : null}
                    {s.code ? (
                      <DropdownMenuItem
                        disabled={busy}
                        onClick={async () => {
                          const r = await run(
                            () => resetPasswordAction(s.id),
                            t.resetDone(s.code ?? ""),
                          );
                          if (r?.ok) setCredentials(r.data);
                        }}
                      >
                        <KeyRound /> {t.resetPassword}
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuItem
                      disabled={busy}
                      variant={s.isActive ? "destructive" : "default"}
                      onClick={() => run(() => setActiveAction(s.id, !s.isActive))}
                    >
                      <Power /> {s.isActive ? t.deactivate : t.activate}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="gap-3 rounded-3xl p-5 sm:max-w-md">
          <DialogTitle className="text-lg font-bold">{t.add}</DialogTitle>
          <DialogDescription className="sr-only">{t.add}</DialogDescription>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={lo.otp.phonePlaceholder}
            aria-label={lo.otp.phone}
            inputMode="tel"
            maxLength={20}
            className={cn(field, "money")}
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
          <DialogDescription>{t.importHintPhone}</DialogDescription>
          <Textarea
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            placeholder={"02055551234,ສົມສັກ ໄຊຍະວົງ\n02077778888,ນາງ ແກ້ວ ພົມມະລາ"}
            aria-label={t.import}
            className="min-h-36 rounded-2xl border-2 p-3 money"
          />
          <Button variant="chunky" size="xl" disabled={!bulk.trim() || busy} onClick={importBulk}>
            {t.importCta}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={credentials !== null} onOpenChange={(o) => !o && setCredentials(null)}>
        <DialogContent className="gap-3 rounded-3xl p-5 sm:max-w-md">
          <DialogTitle className="text-lg font-bold">{t.tempPasswordTitle}</DialogTitle>
          <DialogDescription>{t.tempPasswordHint}</DialogDescription>
          {credentials ? (
            <div className="flex items-center justify-between gap-3 rounded-2xl border-2 px-3 py-2">
              <span className="min-w-0">
                <span className="block money font-bold">{credentials.code}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {credentials.name}
                </span>
              </span>
              <code className="rounded-lg bg-muted px-2 py-1 money text-base font-bold select-all">
                {credentials.password}
              </code>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
