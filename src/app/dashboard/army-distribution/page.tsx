import { requireAuth } from "@/lib/auth/server";
import { getFactionBreakdownWithIds, type FactionBreakdownFilter } from "@/lib/queries/statistics";
import { FactionBreakdownChart } from "@/components/dashboard/faction-breakdown-chart";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

const FILTER_LABELS: Record<FactionBreakdownFilter, { title: string; description: string }> = {
  all: { title: "Army Distribution", description: "All factions in your collection" },
  complete: {
    title: "Army Distribution (Battle Ready)",
    description: "Factions by completed miniatures",
  },
  in_progress: {
    title: "Army Distribution (In Progress)",
    description: "Sub-assembled, Built, Primed, Painting started",
  },
  backlog: {
    title: "Army Distribution (Not Started)",
    description: "Backlog, Unknown, Missing, and related statuses",
  },
};

export default async function ArmyDistributionPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await requireAuth();
  const params = await searchParams;
  const filter = (params.filter === "complete" || params.filter === "in_progress" || params.filter === "backlog"
    ? params.filter
    : "all") as FactionBreakdownFilter;
  const factionData = await getFactionBreakdownWithIds(user.id, filter);
  const labels = FILTER_LABELS[filter];
  const miniaturesStatusFilter =
    filter === "complete" ? "complete" : filter === "in_progress" ? "in_progress" : filter === "backlog" ? "not_started" : undefined;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-wider">{labels.title}</h1>
          <p className="text-muted-foreground mt-1">{labels.description}</p>
        </div>
      </div>

      {factionData.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground uppercase text-sm tracking-wide rounded-lg border border-primary/20 bg-card">
          No faction data for this filter. Add miniatures and assign factions to see your army distribution.
        </div>
      ) : (
        <FactionBreakdownChart
          factionData={factionData}
          href={undefined}
          miniaturesStatusFilter={miniaturesStatusFilter}
        />
      )}
    </div>
  );
}
