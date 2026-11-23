/**
 * Database types matching supabase/migrations (hand-maintained; the Supabase CLI
 * is not installed on this machine). Keep in sync when migrations change.
 */
export type Role = "student" | "committee";
export type PaymentStatus = "pending" | "approved" | "rejected";
export type PaymentSource = "transfer" | "cash";

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface ProfileRow {
  id: string;
  student_code: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  must_change_password: boolean;
  phone: string | null;
  created_at: string;
}

export interface SettingsRow {
  id: number;
  weekly_amount: number;
  start_date: string;
  bank_name: string | null;
  account_name: string | null;
  account_no: string | null;
  qr_path: string | null;
  note: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface PaymentRow {
  id: string;
  student_id: string;
  week_start: string;
  amount: number;
  source: PaymentSource;
  slip_path: string | null;
  slip_sha256: string | null;
  transfer_ref: string | null;
  note: string | null;
  status: PaymentStatus;
  reject_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  self_reviewed: boolean;
  created_at: string;
}

export interface ExpenseRow {
  id: string;
  title: string;
  amount: number;
  spent_at: string;
  note: string | null;
  receipt_path: string | null;
  created_by: string | null;
  created_at: string;
}

export interface AuditRow {
  id: number;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: Table<
        ProfileRow,
        Pick<ProfileRow, "id" | "student_code" | "full_name"> & Partial<ProfileRow>,
        Partial<Pick<ProfileRow, "full_name" | "phone" | "is_active" | "must_change_password" | "role">>
      >;
      settings: Table<SettingsRow, Partial<SettingsRow> & Pick<SettingsRow, "start_date">, Partial<SettingsRow>>;
      payments: Table<
        PaymentRow,
        Pick<PaymentRow, "student_id" | "week_start" | "amount"> & Partial<PaymentRow>,
        Partial<Pick<PaymentRow, "status" | "reject_reason">>
      >;
      expenses: Table<
        ExpenseRow,
        Pick<ExpenseRow, "title" | "amount" | "spent_at"> & Partial<ExpenseRow>,
        Partial<ExpenseRow>
      >;
      audit_log: Table<AuditRow, never, never>;
    };
    Views: Record<string, never>;
    Functions: {
      get_fund_summary: {
        Args: Record<string, never>;
        Returns: {
          total_approved: number;
          total_expenses: number;
          balance: number;
          pending_count: number;
        }[];
      };
      is_committee: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
