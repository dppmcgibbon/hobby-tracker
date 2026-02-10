"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
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

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    // Only show label if the segment is large enough (> 5%)
    if (percent < 0.05) return null;
    
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-xs font-bold"
        style={{ textShadow: '0 0 3px black, 0 0 3px black' }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card className="warhammer-card border-primary/30">
      <CardHeader>
        <CardTitle className="text-xl uppercase tracking-wide text-primary">
          Force Composition
        </CardTitle>
        <CardDescription>Battle readiness by status</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={90}
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
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value) => <span className="text-sm">{value}</span>}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(0, 0%, 10%)",
                border: "1px solid hsl(43, 96%, 56%, 0.3)",
                borderRadius: "0.25rem",
                color: "hsl(40, 10%, 85%)",
              }}
              labelStyle={{
                color: "hsl(40, 10%, 85%)",
                fontWeight: "bold",
              }}
              itemStyle={{
                color: "hsl(40, 10%, 85%)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
