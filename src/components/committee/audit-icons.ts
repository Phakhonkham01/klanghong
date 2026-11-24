import {
  Check,
  Coins,
  Hourglass,
  Pencil,
  Receipt,
  RotateCcw,
  Settings,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import type { AuditAction } from "@/lib/data/types";

export const auditIcon: Record<AuditAction, { icon: LucideIcon; tone: string }> = {
  approve: { icon: Check, tone: "bg-status-paid text-white" },
  reject: { icon: RotateCcw, tone: "bg-status-rejected text-white" },
  reopen: { icon: Hourglass, tone: "bg-status-pending text-white" },
  expense_create: { icon: Receipt, tone: "bg-sky text-white" },
  expense_update: { icon: Pencil, tone: "bg-sky text-white" },
  expense_delete: { icon: Trash2, tone: "bg-muted-foreground text-white" },
  settings_update: { icon: Settings, tone: "bg-muted-foreground text-white" },
  cash_payment: { icon: Coins, tone: "bg-status-paid text-white" },
};
