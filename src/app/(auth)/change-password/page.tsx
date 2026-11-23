import { Card, CardContent } from "@/components/ui/card";
import { lo } from "@/lib/i18n/lo";

export default function Page() {
  return (
    <Card className="rounded-2xl">
      <CardContent className="py-10 text-center text-muted-foreground">
        {lo.common.comingSoon}
      </CardContent>
    </Card>
  );
}
