import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { WalletActivity } from "@workspace/api-client-react";
import { ArrowRightLeft, Calendar, Cuboid, Flame, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface ActivitySummaryProps {
  activity: WalletActivity;
}

export function ActivitySummary({ activity }: ActivitySummaryProps) {
  return (
    <div className="w-full max-w-6xl mx-auto px-4 mt-16">
      <h2 className="text-xl font-semibold text-foreground mb-6">Your Arc Activity Summary</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-card shadow-sm border-border">
          <CardContent className="p-4 flex flex-col items-start">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-foreground">{activity.totalTransactions}</p>
            <p className="text-xs font-medium text-muted-foreground mt-1">Total Transactions</p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm border-border">
          <CardContent className="p-4 flex flex-col items-start">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 text-green-600 flex items-center justify-center mb-3">
              <Calendar className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-foreground">{activity.activeDays}</p>
            <p className="text-xs font-medium text-muted-foreground mt-1">Active Days</p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm border-border">
          <CardContent className="p-4 flex flex-col items-start">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center mb-3">
              <Cuboid className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-foreground">{activity.uniqueContracts}</p>
            <p className="text-xs font-medium text-muted-foreground mt-1">Unique Contracts</p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm border-border">
          <CardContent className="p-4 flex flex-col items-start">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center mb-3">
              <Flame className="w-4 h-4" />
            </div>
            <p className="text-sm font-semibold text-foreground mt-1">{formatDate(activity.firstActivity)}</p>
            <p className="text-xs font-medium text-muted-foreground mt-1">First Activity</p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm border-border">
          <CardContent className="p-4 flex flex-col items-start">
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-600 flex items-center justify-center mb-3">
              <Clock className="w-4 h-4" />
            </div>
            <p className="text-sm font-semibold text-foreground mt-1">{formatDate(activity.lastActivity)}</p>
            <p className="text-xs font-medium text-muted-foreground mt-1">Last Activity</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
