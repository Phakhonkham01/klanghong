/** View models shared by server queries and client components (no secrets, no server imports). */
import type { PaymentLike } from "@/lib/status";
import type { IsoDate } from "@/lib/week";

export interface PaymentView extends PaymentLike {
  id: string;
  student_id: string;
  source: "transfer" | "cash";
  hasSlip: boolean;
  reviewed_at: string | null;
  /** Reviewer's name; null for students (they cannot read other profiles). */
  reviewer: string | null;
  reference: string | null;
  note: string | null;
  self_reviewed: boolean;
}

export interface StudentView {
  id: string;
  /** Student code; committee accounts sign in with it. Phone sign-ups may have none. */
  code: string | null;
  name: string;
  phone: string | null;
  isActive: boolean;
  role: "student" | "committee";
  mustChangePassword: boolean;
  approval: "pending" | "approved" | "rejected";
  mustSetName: boolean;
  /** OTP codes sent this month (committee view only). */
  otpUsed?: number;
}

/** Approved, active profile: counts as a paying class member. */
export function isMember(s: Pick<StudentView, "isActive" | "approval">): boolean {
  return s.isActive && s.approval === "approved";
}

/** Code if set, else formatted phone. */
export function studentLabel(s: Pick<StudentView, "code" | "phone">): string {
  if (s.code) return s.code;
  const d = s.phone ?? "";
  return d.length === 10 ? `0${d.slice(0, 2)} ${d.slice(2, 6)} ${d.slice(6)}` : d;
}

export interface ExpenseView {
  id: string;
  title: string;
  amount: number;
  spent_at: IsoDate;
  note: string | null;
  hasReceipt: boolean;
}

export type AuditAction =
  | "approve"
  | "reject"
  | "reopen"
  | "expense_create"
  | "expense_update"
  | "expense_delete"
  | "settings_update"
  | "cash_payment";

export interface AuditView {
  id: number;
  actor: string;
  action: AuditAction;
  detail: string;
  created_at: string;
}

export interface SettingsView {
  weeklyAmount: number;
  startDate: IsoDate;
  bankName: string;
  accountName: string;
  accountNo: string;
  qrPath: string | null;
  /** Short-lived signed URL for the QR image. */
  qrUrl: string | null;
  note: string;
}

export interface FundSummary {
  totalApproved: number;
  totalExpenses: number;
  balance: number;
  pendingCount: number;
}

/** Result shape for server actions called from client components. */
export type ActionResult<T = undefined> =
  ({ ok: true } & (T extends undefined ? object : { data: T })) | { ok: false; error: string };
