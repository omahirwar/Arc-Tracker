import React from "react";
import { WalletActivity } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { truncateAddress, formatDate } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

export function ContractsTab({ activity }: { activity: WalletActivity }) {
  const contracts = activity.contracts || [];
  const explorerUrl = import.meta.env.VITE_ARC_EXPLORER_URL || "https://explorer.arc.net";

  if (contracts.length === 0) {
    return <div className="text-center py-12 text-muted-foreground text-sm">No contract interactions found.</div>;
  }

  return (
    <div className="mt-6 border border-border rounded-lg overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50 border-border">
            <TableHead>Contract</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Interactions</TableHead>
            <TableHead>Last Interaction</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contracts.map((c, i) => (
            <TableRow key={i} className="border-border">
              <TableCell className="font-mono text-sm">
                <a href={`${explorerUrl}/address/${c.address}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-primary hover:underline">
                  {truncateAddress(c.address)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </TableCell>
              <TableCell className="font-medium">{c.name || "Unknown Contract"}</TableCell>
              <TableCell>
                {c.category ? <Badge variant="secondary" className="font-normal">{c.category}</Badge> : '-'}
              </TableCell>
              <TableCell>{c.interactions}</TableCell>
              <TableCell className="text-sm">{formatDate(c.lastInteraction || null)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
