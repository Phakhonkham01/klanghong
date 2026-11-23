import Link from "next/link";
import { Landmark } from "lucide-react";
import { lo } from "@/lib/i18n/lo";

export function Brand({ href }: { href: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 rounded-lg font-semibold">
      <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-2 text-white shadow-sm">
        <Landmark className="size-5" aria-hidden />
      </span>
      <span className="text-lg leading-none">{lo.app.name}</span>
    </Link>
  );
}
