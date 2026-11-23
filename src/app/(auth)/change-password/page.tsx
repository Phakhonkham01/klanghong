import { Brand } from "@/components/layout/brand";
import { lo } from "@/lib/i18n/lo";

export default function Page() {
  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 flex justify-center">
          <Brand href="/login" />
        </div>
        <p className="rounded-2xl border-2 py-10 text-muted-foreground">{lo.common.comingSoon}</p>
      </div>
    </div>
  );
}
