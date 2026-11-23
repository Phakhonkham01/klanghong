import {
  BarChart3,
  ClipboardCheck,
  History,
  House,
  LayoutDashboard,
  ScrollText,
  Settings,
  Table2,
  UserRound,
  Users,
  Wallet,
  Receipt,
  type LucideIcon,
} from "lucide-react";
import { lo } from "@/lib/i18n/lo";

export type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean };

export const studentNav: NavItem[] = [
  { href: "/dashboard", label: lo.nav.dashboard, icon: House },
  { href: "/pay", label: lo.nav.pay, icon: Wallet },
  { href: "/history", label: lo.nav.history, icon: History },
  { href: "/profile", label: lo.nav.profile, icon: UserRound },
];

export const committeeNav: NavItem[] = [
  { href: "/committee", label: lo.nav.committee, icon: LayoutDashboard, exact: true },
  { href: "/committee/review", label: lo.nav.review, icon: ClipboardCheck },
  { href: "/committee/members", label: lo.nav.members, icon: Table2 },
  { href: "/committee/students", label: lo.nav.students, icon: Users },
  { href: "/committee/expenses", label: lo.nav.expenses, icon: Receipt },
  { href: "/committee/reports", label: lo.nav.reports, icon: BarChart3 },
  { href: "/committee/settings", label: lo.nav.settings, icon: Settings },
  { href: "/committee/audit", label: lo.nav.audit, icon: ScrollText },
];

export function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
