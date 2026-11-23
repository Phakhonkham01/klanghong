/**
 * Committee-side demo data until Supabase is connected (Phase 2/3).
 * Deterministic so screenshots and tests are stable for a given "now".
 */
import { demoSettings, type DemoPayment } from "@/lib/demo";
import { formatWeekRange } from "@/lib/format";
import { listWeeks, type IsoDate } from "@/lib/week";

export interface DemoStudent {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  isActive: boolean;
  role: "student" | "committee";
}

export interface DemoCommitteePayment extends DemoPayment {
  student_id: string;
}

export interface DemoExpense {
  id: string;
  title: string;
  amount: number;
  spent_at: IsoDate;
  note: string | null;
  hasReceipt: boolean;
}

export interface DemoAudit {
  id: number;
  actor: string;
  action: "approve" | "reject" | "expense_create" | "settings_update" | "cash_payment";
  detail: string;
  created_at: string;
}

const NAMES = [
  "ສົມພອນ ພົມມະຈັນ",
  "ນາງ ມະນີວອນ ສີສຸວັນ",
  "ທອງໄຊ ແກ້ວມະນີ",
  "ນາງ ພອນທິບ ວົງສາ",
  "ບຸນມີ ຈັນທະວົງ",
  "ນາງ ແສງເດືອນ ພົມມະວົງ",
  "ອານຸສອນ ສີລາວົງ",
  "ນາງ ດາວວອນ ໄຊຍະສານ",
  "ວິໄລ ສຸລິຍະວົງ",
  "ນາງ ຄຳແພງ ອິນທະວົງ",
  "ສຸກສະຫວັນ ພິລາວັນ",
  "ນາງ ນົງລັກ ແສງສະຫວ່າງ",
  "ພູວົງ ບຸບຜາ",
  "ນາງ ອາລຸນີ ດວງມາລາ",
];

export const committeeMembers = ["ນາງ ມະນີວອນ", "ທອງໄຊ"];

export const demoStudents: DemoStudent[] = NAMES.map((name, i) => ({
  id: `stu-${String(i + 1).padStart(2, "0")}`,
  code: `IT2026${String(i + 1).padStart(3, "0")}`,
  name,
  phone: i % 3 === 0 ? `020 5${String(5000000 + i * 1234).slice(0, 7)}` : null,
  isActive: i !== 12,
  role: i === 1 || i === 2 ? "committee" : "student",
}));

/** Small deterministic PRNG (mulberry32). */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const REASONS = ["ສະລິບບໍ່ຊັດເຈນ", "ຈຳນວນເງິນບໍ່ຖືກ", "ສະລິບຊ້ຳ"];

export function demoAllPayments(now: Date = new Date()): DemoCommitteePayment[] {
  const weeks = listWeeks(demoSettings.startDate, now);
  const out: DemoCommitteePayment[] = [];
  demoStudents.forEach((s, si) => {
    if (!s.isActive) return;
    const r = rng(si + 7);
    const diligence = 0.55 + r() * 0.45;
    weeks.forEach((week_start, wi) => {
      const isCurrent = wi === weeks.length - 1;
      const roll = r();
      const hour = String(1 + Math.floor(r() * 12)).padStart(2, "0");
      const day = Math.min(4, Math.floor(r() * 5));
      const created = new Date(
        `${week_start}T${hour}:${String(Math.floor(r() * 60)).padStart(2, "0")}:00Z`,
      );
      created.setUTCDate(created.getUTCDate() + day);
      // Never date a demo slip in the future.
      const latest = now.getTime() - (si + 1) * 40 * 60_000;
      if (created.getTime() > latest) created.setTime(latest);
      const created_at = created.toISOString();
      const base = {
        id: `pay-${s.id}-${week_start}`,
        student_id: s.id,
        week_start,
        amount: demoSettings.weeklyAmount,
        created_at,
        reviewed_at: null as string | null,
        reviewer: null as string | null,
        reference: `FT${week_start.replace(/-/g, "")}${si}`,
        note: null as string | null,
        source: "transfer" as const,
      };
      const reviewed = {
        reviewed_at: new Date(
          Math.min(created.getTime() + 5 * 3600_000, now.getTime() - 10 * 60_000),
        ).toISOString(),
        reviewer: committeeMembers[(si + wi) % 2]!,
      };
      if (isCurrent) {
        if (roll < 0.35) out.push({ ...base, ...reviewed, status: "approved" });
        else if (roll < 0.7) out.push({ ...base, status: "pending" });
        return;
      }
      if (roll < diligence - 0.08) out.push({ ...base, ...reviewed, status: "approved" });
      else if (roll < diligence)
        out.push({
          ...base,
          ...reviewed,
          status: "rejected",
          reject_reason: REASONS[Math.floor(r() * REASONS.length)]!,
        });
      else if (roll < diligence + 0.08 && wi >= weeks.length - 3)
        out.push({ ...base, status: "pending" });
    });
  });
  return out;
}

export const demoExpenses: DemoExpense[] = [
  {
    id: "exp-1",
    title: "ຊື້ນ້ຳດື່ມ ແລະ ເຂົ້າໜົມ ງານສຳມະນາ",
    amount: 85_000,
    spent_at: "2026-10-16",
    note: null,
    hasReceipt: true,
  },
  {
    id: "exp-2",
    title: "ປິ້ນເອກະສານບົດລາຍງານ",
    amount: 42_000,
    spent_at: "2026-10-28",
    note: "ຮ້ານໃກ້ມະຫາໄລ",
    hasReceipt: true,
  },
  {
    id: "exp-3",
    title: "ຂອງຂວັນວັນຄູ",
    amount: 150_000,
    spent_at: "2026-11-06",
    note: null,
    hasReceipt: false,
  },
  {
    id: "exp-4",
    title: "ຄ່າເຊົ່າລຳໂພງ ກິດຈະກຳຫ້ອງ",
    amount: 60_000,
    spent_at: "2026-11-18",
    note: null,
    hasReceipt: true,
  },
];

export function demoAudit(payments: DemoCommitteePayment[]): DemoAudit[] {
  const byId = new Map(demoStudents.map((s) => [s.id, s]));
  const reviewed = payments
    .filter((p) => p.reviewed_at && p.status !== "pending")
    .sort((a, b) => b.reviewed_at!.localeCompare(a.reviewed_at!))
    .slice(0, 12)
    .map((p, i): DemoAudit => ({
      id: 1000 - i,
      actor: p.reviewer ?? "",
      action: p.status === "approved" ? "approve" : "reject",
      detail: `${byId.get(p.student_id)?.name ?? ""} · ${formatWeekRange(p.week_start)}`,
      created_at: p.reviewed_at!,
    }));
  const expenses = demoExpenses.map((e, i): DemoAudit => ({
    id: 500 - i,
    actor: committeeMembers[i % 2]!,
    action: "expense_create",
    detail: e.title,
    created_at: `${e.spent_at}T08:00:00Z`,
  }));
  return [...reviewed, ...expenses].sort((a, b) => b.created_at.localeCompare(a.created_at));
}
