import { auditIcon } from "@/components/committee/audit-icons";
import { requireSession } from "@/lib/auth";
import { getAudit } from "@/lib/data/queries";
import { formatDateTimeLo } from "@/lib/format";
import { lo } from "@/lib/i18n/lo";
import { cn } from "@/lib/utils";

export const metadata = { title: lo.nav.audit };

export default async function Page() {
  await requireSession("committee");
  const entries = await getAudit(200);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{lo.committee.audit.title}</h1>
      {entries.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed py-14 text-center text-muted-foreground">
          {lo.committee.audit.empty}
        </p>
      ) : null}
      <ol className="relative space-y-3 before:absolute before:top-2 before:bottom-2 before:left-[1.1rem] before:w-0.5 before:bg-border">
        {entries.map((a) => {
          const { icon: Icon, tone } = auditIcon[a.action];
          return (
            <li key={a.id} className="relative flex items-start gap-3">
              <span
                className={cn(
                  "z-10 grid size-9 shrink-0 place-items-center rounded-full ring-4 ring-background",
                  tone,
                )}
              >
                <Icon className="size-4" strokeWidth={2.8} aria-hidden />
              </span>
              <div className="min-w-0 flex-1 rounded-2xl border-2 px-3 py-2">
                <p className="text-sm font-bold">{lo.committee.audit.actions[a.action]}</p>
                <p className="truncate text-sm">{a.detail}</p>
                <p className="text-xs text-muted-foreground">
                  {a.actor} · {formatDateTimeLo(a.created_at)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
