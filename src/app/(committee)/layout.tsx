import { CommitteeShell } from "@/components/layout/committee-shell";

export default function CommitteeLayout({ children }: { children: React.ReactNode }) {
  return <CommitteeShell>{children}</CommitteeShell>;
}
