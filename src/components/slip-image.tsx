"use client";

import { useEffect, useState } from "react";
import { ImageOff, Loader2 } from "lucide-react";
import { getSlipUrlAction } from "@/app/actions/payments";
import { lo } from "@/lib/i18n/lo";
import { cn } from "@/lib/utils";

type State = { id: string; url: string | null; failed: boolean };

/** Loads a payment's slip through a short-lived signed URL (RLS-checked on the server). */
export function SlipImage({
  paymentId,
  alt,
  className,
}: {
  paymentId: string;
  alt: string;
  className?: string;
}) {
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSlipUrlAction(paymentId)
      .then((r) => {
        if (!cancelled) setState({ id: paymentId, url: r.ok ? r.data : null, failed: !r.ok });
      })
      .catch(() => {
        if (!cancelled) setState({ id: paymentId, url: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [paymentId]);

  const current = state?.id === paymentId ? state : null;

  if (!current) {
    return (
      <span className={cn("grid place-items-center text-muted-foreground", className)}>
        <Loader2 className="size-6 animate-spin" aria-label={lo.common.loading} />
      </span>
    );
  }
  if (current.failed || !current.url) {
    return (
      <span
        className={cn(
          "flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground",
          className,
        )}
      >
        <ImageOff className="size-8" aria-hidden />
        {lo.errors.slipUnavailable}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- signed URL from private storage
    <img src={current.url} alt={alt} className={cn("object-contain", className)} />
  );
}
