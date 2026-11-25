import { formatDateTimeLo } from "@/lib/format";
import { lo } from "@/lib/i18n/lo";
import { cn } from "@/lib/utils";

const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "";
const commit = process.env.NEXT_PUBLIC_APP_COMMIT ?? "";
const builtAt = process.env.NEXT_PUBLIC_APP_BUILT_AT ?? "";

/** Build label (version · commit · build time) to check that an update went live. */
export function AppVersion({ className }: { className?: string }) {
  const parts = [
    `${lo.profile.version} ${version}`,
    commit || null,
    builtAt ? formatDateTimeLo(builtAt) : null,
  ].filter(Boolean);
  return (
    <p
      className={cn("money text-xs text-muted-foreground", className)}
      title={builtAt || undefined}
    >
      {parts.join(" · ")}
    </p>
  );
}
