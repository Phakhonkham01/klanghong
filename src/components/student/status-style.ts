import {
  Check,
  Hourglass,
  Lock,
  RotateCcw,
  TriangleAlert,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { WeekStatus } from "@/lib/status";

export type NodeKind = WeekStatus | "future";

/** Fill + 3D edge for each week node; shade uses color-mix so it follows the theme. */
export const nodeStyle: Record<NodeKind, { className: string; icon: LucideIcon }> = {
  paid: {
    className:
      "bg-status-paid text-white [--press-shade:color-mix(in_oklch,var(--status-paid),black_25%)]",
    icon: Check,
  },
  pending: {
    className:
      "bg-status-pending text-white [--press-shade:color-mix(in_oklch,var(--status-pending),black_25%)]",
    icon: Hourglass,
  },
  rejected: {
    className:
      "bg-status-rejected text-white [--press-shade:color-mix(in_oklch,var(--status-rejected),black_25%)]",
    icon: RotateCcw,
  },
  overdue: {
    className:
      "bg-status-overdue text-white [--press-shade:color-mix(in_oklch,var(--status-overdue),black_30%)]",
    icon: TriangleAlert,
  },
  unpaid: {
    className: "bg-primary text-primary-foreground [--press-shade:var(--brand-shade)]",
    icon: Wallet,
  },
  future: {
    className: "bg-muted text-muted-foreground [--press-shade:var(--tile-shade)]",
    icon: Lock,
  },
};

export const dotClass: Record<WeekStatus, string> = {
  paid: "bg-status-paid",
  pending: "bg-status-pending",
  rejected: "bg-status-rejected",
  overdue: "bg-status-overdue",
  unpaid: "bg-status-unpaid",
};
