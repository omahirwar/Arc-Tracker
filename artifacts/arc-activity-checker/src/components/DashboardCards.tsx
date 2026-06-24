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
      <div className="w-full max-w-sm mx-auto px-4 mt-12">
        <Card className="animate-pulse bg-card shadow-sm border-border h-80" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full mt-12 px-4">

      {/* Arc Score — Reputation Score Card */}
      <Card className="bg-card shadow-sm border-border flex flex-col hover:shadow-md transition-shadow w-full max-w-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between items-center">
            Arc Score – Reputation Score
            <Info className="w-4 h-4 text-muted-foreground/50" />
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col items-center justify-center flex-1 pb-2">
          {/* Wallet address */}
          <div className="flex items-center gap-2 mb-5 w-full justify-center">
            <Identicon address={activity.address} size={28} />
            <span className="font-mono text-sm text-foreground">{truncateAddress(activity.address)}</span>
          </div>

          {activity.arcScore !== null && activity.arcScore !== undefined ? (
            <div className="flex flex-col items-center w-full">
              {/* Gauge + overlaid score */}
              <div className="relative flex justify-center w-full">
                <SemiCircleGauge value={activity.arcScore} size={220} strokeWidth={22} />
                {/* Score text centered inside the arch opening */}
                <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-1 pointer-events-none">
                  <span className="text-5xl font-extrabold text-primary leading-none">
                    {activity.arcScore}
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
                    Arc Score
                  </span>
                </div>
              </div>

              {/* Low / High labels */}
              <div className="flex justify-between w-full px-2 mt-2 text-xs font-semibold">
                <span className="text-red-500">Low</span>
                <span className="text-green-500">High</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-center px-4">
              <p className="font-medium text-foreground">Score unavailable</p>
              <p className="text-xs text-muted-foreground mt-2">
                Full activity history could not be retrieved.
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex-col gap-3 pt-4 border-t border-border/50">
          <div className="w-full text-xs text-muted-foreground">
            Powered by Arc Activity Index
          </div>
          <Button
            variant="outline"
            className="w-full text-primary border-primary/20 hover:bg-primary/5"
          >
            View Score Breakdown
          </Button>
        </CardFooter>
      </Card>

      {/* Disclaimer */}
      {activity.arcScore !== null && (
        <p className="text-center text-xs text-muted-foreground mt-4 max-w-sm">
          This is an independent activity estimate based on publicly available on-chain data.
          It does not confirm official airdrop eligibility.
        </p>
      )}
    </div>
  );
}
