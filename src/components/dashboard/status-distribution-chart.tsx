"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface StatusDistributionChartProps {
  data: Record<string, number>;
}

const COLORS = {
  backlog: "#64748b",
  assembled: "#3b82f6",
  primed: "#a855f7",
  painting: "#eab308",
  completed: "#22c55e",
};

const STATUS_LABELS = {
  backlog: "Backlog",
  assembled: "Assembled",
  primed: "Primed",
  painting: "In Progress",
  completed: "Completed",
};

export function StatusDistributionChart({ data }: StatusDistributionChartProps) {
  const chartData = Object.entries(data)
    .filter(([, value]) => value > 0)
    .map(([status, value]) => ({
      name: STATUS_LABELS[status as keyof typeof STATUS_LABELS],
      value,
      status,
    }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Status Distribution</CardTitle>
          <CardDescription>Breakdown by painting status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">No data available</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status Distribution</CardTitle>
        <CardDescription>Breakdown by painting status</CardDescription>
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
            >
              {chartData.map((entry) => (
                <Cell
                  key={`cell-${entry.status}`}
                  fill={COLORS[entry.status as keyof typeof COLORS]}
                />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
