import React, { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { FAQ } from "@/components/FAQ";
import { DashboardCards } from "@/components/DashboardCards";
import { ActivitySummary } from "@/components/ActivitySummary";
import { DetailedTabs } from "@/components/DetailedTabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCheckWallet, getCheckWalletQueryKey } from "@workspace/api-client-react";
import { isValidAddress } from "@/lib/utils";
import { Wallet, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

export function Home() {
  const [address, setAddress] = useState("");
  const [submittedAddress, setSubmittedAddress] = useState("");

  const isAddressValid = address === "" || isValidAddress(address);
  const canSubmit = address !== "" && isValidAddress(address);

  const { data: activity, isLoading, isError, error } = useCheckWallet(
    { address: submittedAddress },
    { 
      query: { 
        enabled: !!submittedAddress && isValidAddress(submittedAddress), 
        queryKey: getCheckWalletQueryKey({ address: submittedAddress }) 
      } 
    }
  );

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (canSubmit) {
      setSubmittedAddress(address);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Header />

      <main className="flex-1 w-full flex flex-col items-center">
        {/* Hero Section */}
        <section className="w-full max-w-4xl mx-auto px-4 pt-24 pb-12 flex flex-col items-center text-center">
          <a
            href="https://x.com/hi_vecna"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mb-6 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            Developed by @hi_vecna
          </a>

          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-4">
            <span className="text-foreground">Arc</span>{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">
              Activity Checker
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mb-12">
            Check your Arc Testnet activity and see how strong your on-chain profile looks.
          </p>

          <Card className="w-full max-w-2xl bg-card shadow-lg border-border/60">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                  <div className="relative flex-1 w-full">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <Input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Paste your Arc wallet address here"
                      className={`pl-16 h-14 text-base bg-background ${!isAddressValid ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                      disabled={isLoading}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={!canSubmit || isLoading} 
                    className="h-14 px-8 text-base font-medium w-full md:w-auto"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      "Check Activity"
                    )}
                  </Button>
                </div>
                <div className="flex justify-between items-center text-xs px-1 mt-1">
                  <span className={!isAddressValid ? "text-destructive" : "text-muted-foreground"}>
                    {!isAddressValid ? "Invalid EVM address format" : "Example: 0xAbbaC9Be...0b23c9710"}
                  </span>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    We only read public data. No wallet connection required.
                  </span>
                </div>
              </form>
            </CardContent>
          </Card>
        </section>

        {/* Loading State or Results */}
        <AnimatePresence mode="wait">
          {(isLoading || activity || isError) && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full"
            >
              {isError && (
                <div className="w-full max-w-4xl mx-auto px-4 mt-8">
                  <Alert variant="destructive" className="bg-destructive/5 border-destructive/20">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                      {(error as any)?.error || "Failed to fetch wallet activity. Please try again."}
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {activity && activity.dataMode === "unavailable" && !isError && (
                <div className="w-full max-w-4xl mx-auto px-4 mt-8">
                  <Alert className="bg-muted/50 border-border">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Data Unavailable</AlertTitle>
                    <AlertDescription>Arc data source is not configured yet.</AlertDescription>
                  </Alert>
                </div>
              )}

              {activity && activity.dataMode === "full" && activity.totalTransactions === 0 && !isError && (
                <div className="w-full max-w-4xl mx-auto px-4 mt-8 text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Wallet className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No Arc activity found for this wallet.</h3>
                  <p className="text-muted-foreground">This wallet hasn't made any transactions on the Arc Testnet yet.</p>
                </div>
              )}

              {(isLoading || (activity && (activity.totalTransactions > 0 || activity.dataMode === "partial"))) && !isError && (
                <div className="w-full pb-20">
                  {activity?.dataMode === "partial" && (
                    <div className="w-full max-w-6xl mx-auto px-4 mt-8 flex justify-end">
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 font-medium px-3 py-1">
                        Partial Data
                      </Badge>
                    </div>
                  )}
                  
                  {/* The main dashboard cards handles isLoading skeleton internally */}
                  <DashboardCards activity={activity!} isLoading={isLoading} />
                  
                  {!isLoading && activity && (
                    <>
                      <ActivitySummary activity={activity} />
                      <DetailedTabs activity={activity} />
                    </>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <FAQ />
      </main>

      <Footer />
    </div>
  );
}
