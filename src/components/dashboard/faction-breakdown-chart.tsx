"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface FactionBreakdownChartProps {
  factionBreakdown: Record<string, number>;
}

export function FactionBreakdownChart({ factionBreakdown }: FactionBreakdownChartProps) {
  const chartData = Object.entries(factionBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([faction, count]) => ({
      faction: faction.length > 15 ? faction.substring(0, 15) + "..." : faction,
      count,
    }));

  if (chartData.length === 0) {
    return (
      <Card className="warhammer-card border-primary/30">
        <CardHeader>
          <CardTitle className="text-xl uppercase tracking-wide text-primary">
            Army Distribution
          </CardTitle>
          <CardDescription>Top 10 forces in your collection</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground uppercase text-sm tracking-wide">
            No faction data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="warhammer-card border-primary/30">
      <CardHeader>
        <CardTitle className="text-xl uppercase tracking-wide text-primary">
          Army Distribution
        </CardTitle>
        <CardDescription>Top 10 forces in your collection</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 22%)" />
            <XAxis type="number" stroke="hsl(40, 10%, 85%)" />
            <YAxis
              dataKey="faction"
              type="category"
              width={100}
              stroke="hsl(40, 10%, 85%)"
              style={{ fontSize: "0.75rem", fontWeight: "bold" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(0, 0%, 10%)",
                border: "1px solid hsl(43, 96%, 56%, 0.3)",
                borderRadius: "0.25rem",
                color: "hsl(40, 10%, 85%)",
              }}
            />
            <Bar dataKey="count" fill="hsl(43, 96%, 56%)" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
