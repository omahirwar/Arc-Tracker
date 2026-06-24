import React from "react";
import { WalletActivity } from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewTab } from "./tabs/OverviewTab";
import { TransactionsTab } from "./tabs/TransactionsTab";
import { ContractsTab } from "./tabs/ContractsTab";
import { ProtocolsTab } from "./tabs/ProtocolsTab";
import { NFTsTab } from "./tabs/NFTsTab";

export function DetailedTabs({ activity }: { activity: WalletActivity }) {
  return (
    <div className="w-full max-w-6xl mx-auto px-4 mt-16">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none h-12 p-0 overflow-x-auto flex-nowrap">
          <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent rounded-none h-full px-6 font-medium text-muted-foreground">Overview</TabsTrigger>
          <TabsTrigger value="transactions" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent rounded-none h-full px-6 font-medium text-muted-foreground">Transactions</TabsTrigger>
          <TabsTrigger value="contracts" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent rounded-none h-full px-6 font-medium text-muted-foreground">Contracts</TabsTrigger>
          <TabsTrigger value="protocols" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent rounded-none h-full px-6 font-medium text-muted-foreground">Protocols</TabsTrigger>
          <TabsTrigger value="nfts" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent rounded-none h-full px-6 font-medium text-muted-foreground">NFTs</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <OverviewTab activity={activity} />
        </TabsContent>
        <TabsContent value="transactions">
          <TransactionsTab activity={activity} />
        </TabsContent>
        <TabsContent value="contracts">
          <ContractsTab activity={activity} />
        </TabsContent>
        <TabsContent value="protocols">
          <ProtocolsTab activity={activity} />
        </TabsContent>
        <TabsContent value="nfts">
          <NFTsTab activity={activity} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
