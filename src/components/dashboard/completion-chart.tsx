"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface CompletionChartProps {
  completionsByMonth: Record<string, number>;
  additionsByMonth: Record<string, number>;
}

export function CompletionChart({ completionsByMonth, additionsByMonth }: CompletionChartProps) {
  // Get last 6 months
  const months: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    months.push(monthKey);
  }

  const chartData = months.map((monthKey) => {
    const [year, month] = monthKey.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    const monthName = date.toLocaleDateString("en-US", { month: "short" });

    return {
      month: monthName,
      completed: completionsByMonth[monthKey] || 0,
      added: additionsByMonth[monthKey] || 0,
    };
  });

  const hasData = chartData.some((d) => d.completed > 0 || d.added > 0);

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Progress Over Time</CardTitle>
          <CardDescription>Models added and completed per month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No completion data yet. Start painting!
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progress Over Time</CardTitle>
        <CardDescription>Models added and completed per month (last 6 months)</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="added" fill="#3b82f6" name="Added" />
            <Bar dataKey="completed" fill="#22c55e" name="Completed" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
