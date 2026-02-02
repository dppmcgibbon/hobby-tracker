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
      <Card className="warhammer-card border-primary/30">
        <CardHeader>
          <CardTitle className="text-xl uppercase tracking-wide text-primary">
            Campaign Progress
          </CardTitle>
          <CardDescription>Units deployed and battle-ready per month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground uppercase text-sm tracking-wide">
            No campaign data yet. Deploy your forces!
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="warhammer-card border-primary/30">
      <CardHeader>
        <CardTitle className="text-xl uppercase tracking-wide text-primary">
          Campaign Progress
        </CardTitle>
        <CardDescription>Units deployed and battle-ready per month (last 6 months)</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 22%)" />
            <XAxis
              dataKey="month"
              stroke="hsl(40, 10%, 85%)"
              style={{ fontSize: "0.75rem", fontWeight: "bold" }}
            />
            <YAxis stroke="hsl(40, 10%, 85%)" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(0, 0%, 10%)",
                border: "1px solid hsl(43, 96%, 56%, 0.3)",
                borderRadius: "0.25rem",
                color: "hsl(40, 10%, 85%)",
              }}
            />
            <Legend
              wrapperStyle={{
                color: "hsl(40, 10%, 85%)",
                fontWeight: "bold",
                textTransform: "uppercase",
                fontSize: "0.75rem",
              }}
            />
            <Bar dataKey="added" fill="hsl(0, 0%, 45%)" name="Deployed" />
            <Bar dataKey="completed" fill="hsl(43, 96%, 56%)" name="Battle Ready" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
