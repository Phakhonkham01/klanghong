import { Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { lo } from "@/lib/i18n/lo";
import { PageHeader } from "./page-header";

export function Placeholder({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <Card className="rounded-2xl">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <Construction className="size-8" aria-hidden />
          <p>{lo.common.comingSoon}</p>
        </CardContent>
      </Card>
    </>
  );
}
