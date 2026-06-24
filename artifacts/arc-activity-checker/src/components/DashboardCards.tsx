import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Identicon } from "./Identicon";
import { SemiCircleGauge } from "./SemiCircleGauge";
import { truncateAddress } from "@/lib/utils";
import { WalletActivity } from "@workspace/api-client-react";
import { Info } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface DashboardCardsProps {
  activity: WalletActivity;
  isLoading: boolean;
}

export function DashboardCards({ activity, isLoading }: DashboardCardsProps) {
  if (isLoading) {
    return (
      <div className="w-full max-w-xs mx-auto px-4 mt-12">
        <Card className="animate-pulse bg-card shadow-sm border-border h-72" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full mt-10 px-4">
      <Card className="bg-card shadow-md border-border flex flex-col w-full max-w-xs hover:shadow-lg transition-shadow">
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between items-center">
            Arc Score – Reputation Score
            <Info className="w-4 h-4 text-muted-foreground/40" />
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col items-center pb-3">
          {/* Wallet */}
          <div className="flex items-center gap-2 mb-4">
            <Identicon address={activity.address} size={26} />
            <span className="font-mono text-sm text-foreground">{truncateAddress(activity.address)}</span>
          </div>

          {activity.arcScore !== null && activity.arcScore !== undefined ? (
            <>
              {/* Gauge */}
              <SemiCircleGauge value={activity.arcScore} size={210} strokeWidth={20} />

              {/* Score number — directly below gauge */}
              <div className="text-center -mt-2">
                <div className="text-5xl font-extrabold text-primary leading-none">
                  {activity.arcScore}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
                  Arc Score
                </div>
              </div>

              {/* Low / High labels */}
              <div className="flex justify-between w-full px-3 mt-3 text-xs font-semibold">
                <span className="text-red-500">Low</span>
                <span className="text-green-500">High</span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-center px-4">
              <p className="font-medium text-foreground">Score unavailable</p>
              <p className="text-xs text-muted-foreground mt-2">
                Full activity history could not be retrieved.
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex-col gap-3 pt-3 border-t border-border/50">
          <span className="text-xs text-muted-foreground w-full">Powered by Arc Activity Index</span>
          <Button variant="outline" className="w-full text-primary border-primary/20 hover:bg-primary/5">
            View Score Breakdown
          </Button>
        </CardFooter>
      </Card>

      {activity.arcScore !== null && (
        <p className="text-center text-xs text-muted-foreground mt-3 max-w-xs">
          Independent activity estimate. Does not confirm airdrop eligibility.
        </p>
      )}
    </div>
  );
}
