import React from "react";
import { WalletActivity } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { truncateAddress, formatDate } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

export function TransactionsTab({ activity }: { activity: WalletActivity }) {
  const txs = activity.transactions || [];
  const explorerUrl = import.meta.env.VITE_ARC_EXPLORER_URL || "https://explorer.arc.net";

  if (txs.length === 0) {
    return <div className="text-center py-12 text-muted-foreground text-sm">No transactions found.</div>;
  }

  return (
    <div className="mt-6 border border-border rounded-lg overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50 border-border">
            <TableHead>Hash</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>From</TableHead>
            <TableHead>To</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {txs.slice(0, 10).map((tx, i) => (
            <TableRow key={i} className="border-border">
              <TableCell className="font-mono text-sm">
                <a href={`${explorerUrl}/tx/${tx.hash}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-primary hover:underline">
                  {truncateAddress(tx.hash)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="font-normal bg-primary/5 text-primary border-primary/20">{tx.type}</Badge>
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">{truncateAddress(tx.from)}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">{tx.to ? truncateAddress(tx.to) : '-'}</TableCell>
              <TableCell className="text-sm">{formatDate(tx.date)}</TableCell>
              <TableCell>
                <Badge variant={tx.status === 'success' ? 'outline' : 'secondary'} className={tx.status === 'success' ? 'bg-green-500/10 text-green-600 border-green-500/20 font-normal' : 'font-normal'}>
                  {tx.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
