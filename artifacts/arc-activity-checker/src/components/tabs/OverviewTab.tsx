import React from "react";
import { WalletActivity } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export function OverviewTab({ activity }: { activity: WalletActivity }) {
  const breakdown = activity.scoreBreakdown;
  const weekly = activity.weeklyActivity || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      <Card className="bg-card shadow-sm border-border">
        <CardHeader>
          <CardTitle className="text-lg">Score Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {breakdown ? (
            <>
              {Object.entries(breakdown).map(([key, data]: [string, any]) => (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-muted-foreground capitalize">{data.label}</span>
                    <span className="font-semibold">{data.score ?? 0} <span className="text-muted-foreground font-normal">/ {data.max}</span></span>
                  </div>
                  <Progress value={((data.score ?? 0) / data.max) * 100} className="h-2 bg-muted" />
                </div>
              ))}
            </>
          ) : (
            <div className="text-sm text-muted-foreground py-8 text-center">Score breakdown not available.</div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card shadow-sm border-border flex flex-col">
        <CardHeader>
          <CardTitle className="text-lg">Weekly Activity</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-[300px]">
          {weekly.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weekly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.04)' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              No chart data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
