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
      <Card>
        <CardHeader>
          <CardTitle>Faction Breakdown</CardTitle>
          <CardDescription>Top 10 armies in your collection</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">No faction data available</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Faction Breakdown</CardTitle>
        <CardDescription>Top 10 armies in your collection</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="faction" type="category" width={100} />
            <Tooltip />
            <Bar dataKey="count" fill="#8b5cf6" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
