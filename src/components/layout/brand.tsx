import Link from "next/link";
import { PiggyBank } from "lucide-react";
import { lo } from "@/lib/i18n/lo";

export function Brand({ href }: { href: string }) {
  return (
    <Link href={href} className="flex shrink-0 items-center gap-2 rounded-xl font-bold">
      <span className="grid size-10 press-3d place-items-center rounded-xl bg-primary text-primary-foreground [--press-depth:3px] [--press-shade:var(--brand-shade)]">
        <PiggyBank className="size-6" strokeWidth={2.4} aria-hidden />
      </span>
      <span className="text-xl leading-none whitespace-nowrap text-primary">{lo.app.name}</span>
    </Link>
  );
}
