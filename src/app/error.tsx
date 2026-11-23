"use client";

import { Button } from "@/components/ui/button";
import { lo } from "@/lib/i18n/lo";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <h1 className="text-xl font-semibold">{lo.errors.generic}</h1>
        <Button className="mt-6 h-11 px-5" onClick={reset}>
          {lo.common.retry}
        </Button>
      </div>
    </div>
  );
}
