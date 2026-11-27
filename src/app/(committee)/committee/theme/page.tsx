import { ThemePicker } from "@/components/committee/theme-picker";
import { requireSession } from "@/lib/auth";
import { getActiveTheme } from "@/lib/data/queries";
import { lo } from "@/lib/i18n/lo";

export const metadata = { title: lo.nav.theme };

export default async function Page() {
  await requireSession("committee");
  const active = await getActiveTheme();
  return <ThemePicker activeKey={active?.key ?? null} />;
}
