import Link from "next/link";
import { Button } from "@/components/ui/button";
import { lo } from "@/lib/i18n/lo";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <p className="money text-6xl font-bold text-primary">404</p>
        <h1 className="mt-3 text-xl font-semibold">{lo.errors.notFoundTitle}</h1>
        <p className="mt-1 text-muted-foreground">{lo.errors.notFoundBody}</p>
        <Button className="mt-6 h-11 px-5" render={<Link href="/" />}>
          {lo.errors.goHome}
        </Button>
      </div>
    </div>
  );
}
