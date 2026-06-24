import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Identicon } from "./Identicon";
import { CircularProgress } from "./CircularProgress";
import { SemiCircleGauge } from "./SemiCircleGauge";
import { truncateAddress } from "@/lib/utils";
import { WalletActivity } from "@workspace/api-client-react";
import { AlertTriangle, Info } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface DashboardCardsProps {
  activity: WalletActivity;
  isLoading: boolean;
}

export function DashboardCards({ activity, isLoading }: DashboardCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl mx-auto px-4 mt-12">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse bg-card shadow-sm border-border h-80" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl mx-auto px-4 mt-12 relative z-10">
      
      {/* Card 1: Wallet Activity Overview */}
      <Card className="bg-card shadow-sm border-border flex flex-col hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Wallet Activity Overview</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center flex-1 pb-2">
          <div className="flex items-center gap-2 mb-6 w-full justify-center">
            <Identicon address={activity.address} size={24} />
            <span className="font-mono text-sm text-foreground">{truncateAddress(activity.address)}</span>
          </div>
          
          <CircularProgress 
            value={activity.projectsFound} 
            max={activity.totalTrackedProjects} 
            size={120} 
          />
          <p className="mt-4 text-sm font-medium text-foreground text-center">
            projects found with activity
          </p>
        </CardContent>
        <CardFooter className="flex-col gap-3 pt-4 border-t border-border/50">
          <div className="w-full flex justify-between items-center text-xs text-muted-foreground">
            <span>Powered by Arc Activity Index</span>
          </div>
          <Button variant="outline" className="w-full text-primary border-primary/20 hover:bg-primary/5">View Details</Button>
        </CardFooter>
      </Card>

      {/* Card 2: Arc Score */}
      <Card className="bg-card shadow-sm border-border flex flex-col hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between items-center">
            Arc Score – Reputation Score
            <Info className="w-4 h-4 text-muted-foreground/50" />
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center flex-1 pb-2">
          <div className="flex items-center gap-2 mb-4 w-full justify-center">
            <Identicon address={activity.address} size={24} />
            <span className="font-mono text-sm text-foreground">{truncateAddress(activity.address)}</span>
          </div>
          
          {activity.arcScore !== null && activity.arcScore !== undefined ? (
            <div className="flex flex-col items-center">
              <SemiCircleGauge value={activity.arcScore} size={200} />
              <div className="mt-[-20px] text-center">
                <div className="text-3xl font-bold text-foreground">{activity.arcScore}<span className="text-lg text-muted-foreground font-normal">/100</span></div>
                <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider font-semibold">Activity Score</div>
              </div>
              <div className="w-full flex justify-between px-6 mt-4 text-xs font-medium">
                <span className="text-destructive">Low</span>
                <span className="text-green-500">High</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-center px-4">
              <p className="font-medium text-foreground">Score unavailable</p>
              <p className="text-xs text-muted-foreground mt-2">Full activity history could not be retrieved.</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex-col gap-3 pt-4 border-t border-border/50">
          <div className="w-full flex justify-between items-center text-xs text-muted-foreground">
            <span>Powered by Arc Activity Index</span>
          </div>
          <Button variant="outline" className="w-full text-primary border-primary/20 hover:bg-primary/5">View Score Breakdown</Button>
        </CardFooter>
      </Card>

      {/* Card 3: Scam Reports */}
      <Card className="bg-card shadow-sm border-border flex flex-col hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between items-center">
            Arc Scam Reports
            <div className="w-2 h-2 rounded-full bg-green-500" />
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center flex-1 pb-2">
          <div className="flex items-center gap-2 mb-8 w-full justify-center">
            <Identicon address={activity.address} size={24} />
            <span className="font-mono text-sm text-foreground">{truncateAddress(activity.address)}</span>
          </div>
          
          {activity.scamReports !== null && activity.scamReports !== undefined ? (
            <div className="flex flex-col items-center text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${activity.scamReports > 0 ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600'}`}>
                {activity.scamReports > 0 ? <AlertTriangle className="w-8 h-8" /> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8"><path d="M20 6 9 17l-5-5"/></svg>}
              </div>
              <p className="text-lg font-medium text-foreground">
                Scam Reports: <span className={activity.scamReports > 0 ? "text-destructive" : "text-green-600"}>{activity.scamReports}</span>
              </p>
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center h-32 text-center px-4">
               <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                 <Info className="w-6 h-6 text-muted-foreground" />
               </div>
               <p className="font-medium text-foreground">Scam report data unavailable</p>
               <p className="text-xs text-muted-foreground mt-2">No verified reporting source is currently connected.</p>
             </div>
          )}
        </CardContent>
        <CardFooter className="flex-col gap-3 pt-4 border-t border-border/50">
           <div className="w-full flex justify-between items-center text-xs text-muted-foreground">
            <span>Powered by Verified Public Sources</span>
          </div>
          <Button variant="outline" className="w-full text-primary border-primary/20 hover:bg-primary/5">Check Details</Button>
        </CardFooter>
      </Card>
      
      {activity.arcScore !== null && (
        <div className="col-span-1 md:col-span-3 text-center text-xs text-muted-foreground mt-2">
          This is an independent activity estimate based on publicly available on-chain data. It does not confirm official airdrop eligibility.
        </div>
      )}
    </div>
  );
}
