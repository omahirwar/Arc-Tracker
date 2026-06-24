import React from "react";
import { WalletActivity } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { formatDate } from "@/lib/utils";

export function ProtocolsTab({ activity }: { activity: WalletActivity }) {
  const protocols = activity.protocols || [];

  if (protocols.length === 0) {
    return <div className="text-center py-12 text-muted-foreground text-sm">No protocol interactions found.</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
      {protocols.map((p, i) => (
        <Card key={i} className="bg-card shadow-sm border-border flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start mb-2">
              <CardTitle className="text-base">{p.name}</CardTitle>
              <Badge variant="outline" className="font-normal text-xs bg-muted/50">{p.category}</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 text-sm space-y-2 pb-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Interactions</span>
              <span className="font-medium">{p.interactions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">First</span>
              <span>{formatDate(p.firstInteraction || null)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last</span>
              <span>{formatDate(p.lastInteraction || null)}</span>
            </div>
          </CardContent>
          {p.website && (
            <CardFooter className="pt-0 pb-4">
              <Button variant="outline" size="sm" className="w-full text-xs" asChild>
                <a href={p.website} target="_blank" rel="noreferrer">
                  Visit Website <ExternalLink className="w-3 h-3 ml-2" />
                </a>
              </Button>
            </CardFooter>
          )}
        </Card>
      ))}
    </div>
  );
}
