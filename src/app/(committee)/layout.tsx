import { CommitteeShell } from "@/components/layout/committee-shell";
import { getCommitteeBadges } from "@/lib/data/queries";

export default async function CommitteeLayout({ children }: { children: React.ReactNode }) {
  // Red counts on the nav; a failed count just hides the badge.
  const badges = await getCommitteeBadges().catch(() => ({}));
  return <CommitteeShell badges={badges}>{children}</CommitteeShell>;
}
