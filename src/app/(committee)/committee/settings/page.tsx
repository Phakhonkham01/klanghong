import { SettingsForm } from "@/components/committee/settings-form";
import { requireSession } from "@/lib/auth";
import { getSettings } from "@/lib/data/queries";
import { lo } from "@/lib/i18n/lo";

export const metadata = { title: lo.nav.settings };

export default async function Page() {
  await requireSession("committee");
  return <SettingsForm initial={await getSettings()} />;
}
