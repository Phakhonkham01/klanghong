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

export type Approval = "pending" | "approved" | "rejected";

export type ProfileRow = {
  id: string;
  student_code: string | null;
  full_name: string;
  role: Role;
  is_active: boolean;
  must_change_password: boolean;
  phone: string | null;
  approval: Approval;
  must_set_name: boolean;
  created_at: string;
};

export type OtpRequestRow = {
  id: number;
  phone: string;
  code_hash: string;
  ip: string | null;
  created_at: string;
  expires_at: string;
  attempts: number;
  consumed_at: string | null;
};

export type OtpQuotaResetRow = {
  phone: string;
  reset_at: string;
  reset_by: string | null;
};

export type LoginFailureRow = {
  id: number;
  account: string;
  ip: string | null;
  created_at: string;
};

export type LoginLockRow = {
  account: string;
  locked_until: string;
};

export type SettingsRow = {
  id: number;
  weekly_amount: number;
  start_date: string;
  bank_name: string | null;
  account_name: string | null;
  account_no: string | null;
  qr_path: string | null;
  /** Fixed-amount bank QR paths keyed by the number of weeks ("1" … "7"). */
  qr_by_weeks: Record<string, string>;
  /** Festival theme key (src/lib/themes.ts), or null for the default look (0010). */
  active_theme: string | null;
  note: string | null;
  updated_at: string;
  updated_by: string | null;
};

export type PaymentRow = {
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
};

export type ExpenseRow = {
  id: string;
  title: string;
  amount: number;
  spent_at: string;
  note: string | null;
  receipt_path: string | null;
  created_by: string | null;
  created_at: string;
};

export type AuditRow = {
  id: number;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  meta: Record<string, unknown>;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        ProfileRow,
        Pick<ProfileRow, "id" | "full_name"> & Partial<ProfileRow>,
        Partial<ProfileRow>
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
      audit_log: Table<AuditRow, Partial<AuditRow>, Partial<AuditRow>>;
      otp_requests: Table<
        OtpRequestRow,
        Pick<OtpRequestRow, "phone" | "code_hash" | "expires_at"> & Partial<OtpRequestRow>,
        Partial<OtpRequestRow>
      >;
      otp_quota_resets: Table<OtpQuotaResetRow, Pick<OtpQuotaResetRow, "phone"> & Partial<OtpQuotaResetRow>, Partial<OtpQuotaResetRow>>;
      login_failures: Table<
        LoginFailureRow,
        Pick<LoginFailureRow, "account"> & Partial<Omit<LoginFailureRow, "id">>,
        Partial<LoginFailureRow>
      >;
      login_locks: Table<LoginLockRow, LoginLockRow, Partial<LoginLockRow>>;
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
};
