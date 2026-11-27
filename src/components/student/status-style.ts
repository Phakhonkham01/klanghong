import {
  Check,
  Hourglass,
  Lock,
  Plus,
  RotateCcw,
  TriangleAlert,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { WeekStatus } from "@/lib/status";

/** "ahead": an upcoming week that can be paid in advance now. */
export type NodeKind = WeekStatus | "future" | "ahead";

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
  ahead: {
    className: "border-4 border-sky bg-tile text-sky [--press-shade:var(--sky-shade)]",
    icon: Plus,
  },
};

/**
 * Week path ("game map") nodes: Duolingo-like lime green for paid weeks, blue for the week to pay
 * now, light grey for locked weeks. Other statuses keep their usual colors.
 */
export const pathNodeStyle: Record<NodeKind, { className: string; icon: LucideIcon }> = {
  ...nodeStyle,
  paid: {
    className: "bg-grass text-white [--press-shade:var(--grass-shade)]",
    icon: Check,
  },
  unpaid: {
    className: "bg-sky text-white [--press-shade:var(--sky-shade)]",
    icon: Wallet,
  },
  future: {
    className:
      "bg-muted text-muted-foreground/70 [--press-shade:color-mix(in_oklch,var(--muted),black_14%)]",
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

/** Colors for a payment row's own status (approved/pending/rejected). */
export const paymentStyle = {
  approved: {
    fill: "bg-status-paid text-white",
    soft: "bg-status-paid-bg text-status-paid",
    text: "text-status-paid",
    icon: Check,
  },
  pending: {
    fill: "bg-status-pending text-white",
    soft: "bg-status-pending-bg text-status-pending",
    text: "text-status-pending",
    icon: Hourglass,
  },
  rejected: {
    fill: "bg-status-rejected text-white",
    soft: "bg-status-rejected-bg text-status-rejected",
    text: "text-status-rejected",
    icon: RotateCcw,
  },
} as const;
