import { Skeleton } from "@/components/ui/skeleton";
import { lo } from "@/lib/i18n/lo";

/** Shown instantly while a committee page loads its data. */
export default function Loading() {
  return (
    <div className="space-y-5" role="status" aria-label={lo.common.loading}>
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-11 w-36 rounded-2xl" />
      </div>
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
