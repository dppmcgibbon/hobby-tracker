"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";

interface FactionBreakdownChartProps {
  factionBreakdown: Record<string, number>;
}

export function FactionBreakdownChart({ factionBreakdown }: FactionBreakdownChartProps) {
  const chartData = Object.entries(factionBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([faction, count]) => ({
      faction,
      displayName: faction.length > 25 ? faction.substring(0, 25) + "..." : faction,
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
        <style>{`
          .recharts-wrapper .recharts-rectangle:hover {
            opacity: 0.85;
          }
          svg text {
            transition: fill 0.2s ease;
          }
        `}</style>
        <ResponsiveContainer width="100%" height={300}>
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
                        {data.count} miniatures
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar 
              dataKey="count" 
              fill="hsl(43, 96%, 56%)"
            >
              <LabelList 
                dataKey="displayName" 
                position="insideLeft"
                style={{ 
                  fill: "hsl(0, 0%, 10%)", 
                  fontSize: "0.75rem", 
                  fontWeight: "bold",
                  textShadow: "0 0 2px hsl(43, 96%, 56%)",
                  cursor: "pointer",
                }}
                className="faction-label"
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
