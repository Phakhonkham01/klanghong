import { SettingsForm } from "@/components/committee/settings-form";
import { demoSettings } from "@/lib/demo";
import { lo } from "@/lib/i18n/lo";

export const metadata = { title: lo.nav.settings };

export default function Page() {
  return <SettingsForm initial={demoSettings} />;
}
