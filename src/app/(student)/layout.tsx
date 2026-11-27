import { StudentShell } from "@/components/layout/student-shell";
import { FestivalDecor } from "@/components/theme/festival-art";
import { getActiveTheme } from "@/lib/data/queries";
import { themeVars } from "@/lib/themes";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  // The committee's festival theme (or none): re-skins these pages through CSS variables only,
  // so layout and behaviour stay the same. Cached; changes show on the next page load.
  const theme = await getActiveTheme();
  if (!theme) return <StudentShell>{children}</StudentShell>;
  return (
    <div
      data-festival={theme.key}
      style={themeVars(theme) as React.CSSProperties}
      className="isolate min-h-dvh bg-background text-foreground"
    >
      <FestivalDecor kind={theme.decorations.kind} dense={theme.decorations.dense} />
      <StudentShell>{children}</StudentShell>
    </div>
  );
}
