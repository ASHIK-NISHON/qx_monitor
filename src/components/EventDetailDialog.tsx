import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DisplayEvent } from "@/types/qxEvent";
import { ArrowUpRight, ArrowDownRight, Copy, Check } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface EventDetailDialogProps {
  event: DisplayEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getEventBadgeVariant(type: string) {
  switch (type) {
    case "AddToBidOrder":
      return "default";
    case "AddToAskOrder":
      return "destructive";
    case "TransferShareOwnershipAndPossession":
      return "secondary";
    case "IssueAsset":
      return "outline";
    default:
      return "secondary";
  }
}

function getEventTypeLabel(type: string) {
  const labels: Record<string, string> = {
    IssueAsset: "Issue Asset",
    AddToAskOrder: "Ask Order",
    AddToBidOrder: "Bid Order",
    TransferShareOwnershipAndPossession: "Transfer",
    RemoveFromAskOrder: "Cancel Ask",
    RemoveFromBidOrder: "Cancel Bid",
    TransferShareManagementRights: "Mgmt Transfer",
  };
  return labels[type] || type;
}

export function EventDetailDialog({ event, open, onOpenChange }: EventDetailDialogProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();

  if (!event) return null;

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({
      title: "Copied to clipboard",
      description: `${field} copied`,
    });
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Badge variant={getEventBadgeVariant(event.type)} className="text-sm">
              {getEventTypeLabel(event.type)}
            </Badge>
            <span className="text-muted-foreground font-normal">Event Details</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Token & Amount */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border">
            <span className="text-sm text-muted-foreground">Amount</span>
            <span className="font-mono font-bold text-lg text-primary">{event.amount}</span>
          </div>

          {/* From Address */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Source ID (From)</span>
              <button
                onClick={() => copyToClipboard(event.from, "Source ID")}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {copiedField === "Source ID" ? (
                  <Check className="w-3 h-3 text-success" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                Copy
              </button>
            </div>
            <div className="p-3 rounded-lg bg-background/50 border border-border">
              <p className="font-mono text-sm break-all text-foreground">{event.from}</p>
            </div>
          </div>

          {/* Direction Indicator */}
          <div className="flex justify-center">
            {event.type === "AddToBidOrder" ? (
              <ArrowUpRight className="w-6 h-6 text-success" />
            ) : (
              <ArrowDownRight className="w-6 h-6 text-muted-foreground" />
            )}
          </div>

          {/* To Address */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Dest ID (To)</span>
              <button
                onClick={() => copyToClipboard(event.to, "Dest ID")}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {copiedField === "Dest ID" ? (
                  <Check className="w-3 h-3 text-success" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                Copy
              </button>
            </div>
            <div className="p-3 rounded-lg bg-background/50 border border-border">
              <p className="font-mono text-sm break-all text-foreground">{event.to}</p>
            </div>
          </div>

          <Separator />

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Token</span>
              <p className="font-mono text-sm">{event.token}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Tick No</span>
              <Badge variant="outline" className="border-primary/30 text-primary">
                {event.tickNo}
              </Badge>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Time</span>
              <p className="text-sm">{event.time}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Timestamp</span>
              <p className="text-sm text-muted-foreground">{event.timestamp}</p>
            </div>
          </div>

          <Separator />

          {/* Additional QX Details */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">QX Transaction Details</h4>
            
            {event.price !== undefined && (
              <div className="flex justify-between p-2 rounded bg-background/30">
                <span className="text-sm text-muted-foreground">Price</span>
                <span className="font-mono text-sm">{event.price.toLocaleString()}</span>
              </div>
            )}
            
            {event.numberOfShares !== undefined && (
              <div className="flex justify-between p-2 rounded bg-background/30">
                <span className="text-sm text-muted-foreground">Number of Shares</span>
                <span className="font-mono text-sm">{event.numberOfShares.toLocaleString()}</span>
              </div>
            )}

            {event.issuerAddress && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Issuer Address</span>
                <div className="flex items-center justify-between p-2 rounded bg-background/30">
                  <p className="font-mono text-xs break-all text-foreground flex-1">{event.issuerAddress}</p>
                  <button
                    onClick={() => copyToClipboard(event.issuerAddress!, "Issuer Address")}
                    className="ml-2 text-muted-foreground hover:text-foreground"
                  >
                    {copiedField === "Issuer Address" ? (
                      <Check className="w-3 h-3 text-success" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-between p-2 rounded bg-background/30">
              <span className="text-sm text-muted-foreground">Money Flew</span>
              <Badge variant={event.moneyFlew ? "default" : "secondary"}>
                {event.moneyFlew ? "Yes" : "No"}
              </Badge>
            </div>
          </div>

          {/* Transaction ID */}
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Transaction ID</span>
            <div className="flex items-center justify-between p-2 rounded bg-background/30">
              <p className="font-mono text-xs break-all text-foreground flex-1">{event.txId}</p>
              <button
                onClick={() => copyToClipboard(event.txId, "Transaction ID")}
                className="ml-2 text-muted-foreground hover:text-foreground"
              >
                {copiedField === "Transaction ID" ? (
                  <Check className="w-3 h-3 text-success" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}