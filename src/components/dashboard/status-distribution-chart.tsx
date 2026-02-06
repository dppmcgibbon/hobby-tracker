"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/constants/miniature-status";

interface StatusDistributionChartProps {
  data: Record<string, number>;
}

export function StatusDistributionChart({ data }: StatusDistributionChartProps) {
  const chartData = Object.entries(data)
    .filter(([, value]) => value > 0)
    .map(([status, value]) => ({
      name: STATUS_LABELS[status] || status,
      value,
      status,
    }));

  if (chartData.length === 0) {
    return (
      <Card className="warhammer-card border-primary/30">
        <CardHeader>
          <CardTitle className="text-xl uppercase tracking-wide text-primary">
            Force Composition
          </CardTitle>
          <CardDescription>Battle readiness by status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground uppercase text-sm tracking-wide">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="warhammer-card border-primary/30">
      <CardHeader>
        <CardTitle className="text-xl uppercase tracking-wide text-primary">
          Force Composition
        </CardTitle>
        <CardDescription>Battle readiness by status</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              stroke="hsl(0, 0%, 7%)"
              strokeWidth={2}
            >
              {chartData.map((entry) => (
                <Cell
                  key={`cell-${entry.status}`}
                  fill={STATUS_COLORS[entry.status] || "hsl(0, 0%, 50%)"}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(0, 0%, 10%)",
                border: "1px solid hsl(43, 96%, 56%, 0.3)",
                borderRadius: "0.25rem",
                color: "hsl(40, 10%, 85%)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
