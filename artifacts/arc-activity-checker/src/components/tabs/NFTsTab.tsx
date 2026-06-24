import React from "react";
import { WalletActivity } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { truncateAddress, formatDate } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

export function NFTsTab({ activity }: { activity: WalletActivity }) {
  const nfts = activity.nfts || [];
  const explorerUrl = import.meta.env.VITE_ARC_EXPLORER_URL || "https://explorer.arc.net";

  if (nfts.length === 0) {
    return <div className="text-center py-12 text-muted-foreground text-sm">No NFT interactions found.</div>;
  }

  return (
    <div className="mt-6 border border-border rounded-lg overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50 border-border">
            <TableHead>Collection</TableHead>
            <TableHead>Token ID</TableHead>
            <TableHead>Event</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Tx</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {nfts.map((nft, i) => (
            <TableRow key={i} className="border-border">
              <TableCell className="font-medium">
                {nft.collectionName || truncateAddress(nft.contractAddress)}
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">{nft.tokenId || '-'}</TableCell>
              <TableCell>
                <Badge variant="outline" className="font-normal bg-primary/5 text-primary border-primary/20">{nft.eventType}</Badge>
              </TableCell>
              <TableCell className="text-sm">{formatDate(nft.date)}</TableCell>
              <TableCell className="font-mono text-sm">
                <a href={`${explorerUrl}/tx/${nft.transactionHash}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-primary hover:underline">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
