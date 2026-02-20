"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from "recharts";
import { ChevronRight } from "lucide-react";
import type { FactionBreakdownEntry } from "@/lib/queries/statistics";

interface FactionBreakdownChartProps {
  /** Legacy: counts by faction name (dashboard). */
  factionBreakdown?: Record<string, number>;
  /** When set, bars link to miniatures page filtered by faction (army distribution page). */
  factionData?: FactionBreakdownEntry[];
  /** Max number of factions to show (undefined = show all). Used on dashboard. */
  limit?: number;
  /** When set, the card is wrapped in a link to this href (e.g. detail page). */
  href?: string;
  /** When factionData is set, add this status to the miniatures link (e.g. "complete"). */
  miniaturesStatusFilter?: string;
}

export function FactionBreakdownChart({
  factionBreakdown,
  factionData,
  limit,
  href,
  miniaturesStatusFilter,
}: FactionBreakdownChartProps) {
  const router = useRouter();

  const chartData = factionData
    ? (limit !== undefined ? factionData.slice(0, limit) : factionData).map((entry) => ({
        faction: entry.factionName,
        displayName:
          entry.factionName.length > 25
            ? entry.factionName.substring(0, 25) + "..."
            : entry.factionName,
        count: entry.count,
        factionId: entry.factionId,
      }))
    : (() => {
        const sorted = Object.entries(factionBreakdown ?? {}).sort(([, a], [, b]) => b - a);
        return (limit !== undefined ? sorted.slice(0, limit) : sorted).map(([faction, count]) => ({
          faction,
          displayName: faction.length > 25 ? faction.substring(0, 25) + "..." : faction,
          count,
          factionId: undefined as string | null | undefined,
        }));
      })();

  const description = limit !== undefined
    ? `Top ${limit} forces in your collection`
    : "All factions in your collection";

  if (chartData.length === 0) {
    const emptyCard = (
      <Card className={`warhammer-card border-primary/30 ${href ? "h-full flex flex-col" : ""}`}>
        <CardHeader>
          <CardTitle className="text-xl uppercase tracking-wide text-primary">
            Army Distribution
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className={href ? "flex-1" : ""}>
          <div className="text-center py-8 text-muted-foreground uppercase text-sm tracking-wide">
            No faction data available
          </div>
        </CardContent>
      </Card>
    );
    return href ? <Link href={href} className="block h-full">{emptyCard}</Link> : emptyCard;
  }

  const card = (
    <Card className={`warhammer-card border-primary/30 h-full flex flex-col ${href ? "cursor-pointer hover:border-primary/50 transition-colors" : ""}`}>
      <CardHeader>
        <CardTitle className="text-xl uppercase tracking-wide text-primary flex items-center justify-between">
          Army Distribution
          {href && (
            <ChevronRight className="h-5 w-5 text-primary/70 shrink-0" />
          )}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 flex flex-col">
        <style>{`
          .recharts-wrapper .recharts-rectangle:hover {
            opacity: 0.85;
          }
          .faction-chart-clickable .recharts-wrapper .recharts-rectangle {
            cursor: pointer;
          }
          svg text {
            transition: fill 0.2s ease;
          }
        `}</style>
        <div className={chartData.some((d) => d.factionId !== undefined) ? "faction-chart-clickable" : ""}>
        <ResponsiveContainer width="100%" height={limit !== undefined ? 300 : Math.max(300, chartData.length * 36)}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 22%)" />
            <XAxis type="number" stroke="hsl(40, 10%, 85%)" />
            <YAxis type="category" hide />
            <Tooltip
              cursor={false}
              content={({ active, payload }) => {
                if (active && payload && payload[0]) {
                  const data = payload[0].payload;
                  return (
                    <div style={{
                      backgroundColor: "hsl(0, 0%, 10%)",
                      border: "1px solid hsl(43, 96%, 56%, 0.3)",
                      borderRadius: "0.25rem",
                      padding: "8px 12px",
                    }}>
                      <p style={{ color: "hsl(40, 10%, 85%)" }}>
                        {data.faction}: {data.count} miniature{data.count !== 1 ? "s" : ""}
                      </p>
                      {data.factionId !== undefined && (
                        <p style={{ color: "hsl(40, 10%, 65%)", fontSize: "0.7rem", marginTop: 4 }}>
                          Click to view in collection
                        </p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="count"
              fill="hsl(43, 96%, 56%)"
              onClick={(data: { factionId?: string | null }, _index: number, e: React.MouseEvent) => {
                if (data?.factionId === undefined) return;
                e?.stopPropagation?.();
                const factionParam = data.factionId === null ? "none" : data.factionId;
                const params = new URLSearchParams({ faction: factionParam });
                if (miniaturesStatusFilter) params.set("status", miniaturesStatusFilter);
                router.push(`/dashboard/miniatures?${params.toString()}`);
              }}
            >
              <LabelList
                dataKey="displayName"
                position="insideLeft"
                style={{
                  fill: "hsl(0, 0%, 10%)",
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                  textShadow: "0 0 2px hsl(43, 96%, 56%)",
                  cursor: chartData.some((d) => d.factionId !== undefined) ? "pointer" : "default",
                }}
                className="faction-label"
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );

  return href ? <Link href={href} className="block h-full">{card}</Link> : card;
}
