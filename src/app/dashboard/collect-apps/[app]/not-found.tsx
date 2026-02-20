import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CollectAppNotFound() {
  return (
    <div className="space-y-6">
      <div className="border-l-4 border-primary pl-4">
        <h1 className="text-4xl font-black uppercase tracking-wider text-primary gold-glow">
          Not Found
        </h1>
        <p className="text-muted-foreground mt-2 text-base">
          This collect app does not exist.
        </p>
      </div>

      <Card className="warhammer-card border-primary/30">
        <CardHeader>
          <CardTitle className="text-xl uppercase tracking-wide text-primary">
            Collect Apps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button asChild className="btn-warhammer-primary">
            <Link href="/dashboard/collect-apps">Back to Collect Apps</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
