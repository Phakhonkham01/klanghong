import { Skeleton } from "@/components/ui/skeleton";
import { lo } from "@/lib/i18n/lo";

/** Shown instantly while a student page loads its data. */
export default function Loading() {
  return (
    <div className="space-y-4 pt-2" role="status" aria-label={lo.common.loading}>
      <div className="flex justify-between gap-3 py-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-7 w-16 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-20 w-full rounded-2xl" />
      <div className="flex flex-col items-center gap-6 pt-4">
        {[0, -56, -84, -56, 0].map((x, i) => (
          <Skeleton
            key={i}
            className="size-[72px] rounded-full"
            style={{ transform: `translateX(${x}px)` }}
          />
        ))}
      </div>
    </div>
  );
}
