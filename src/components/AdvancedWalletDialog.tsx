import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Loader2, Wallet, TrendingUp, TrendingDown, Package, CheckCircle, XCircle } from "lucide-react";
import { WalletAnalysisResult, WalletStatistics, OwnedAsset, PossessedAsset, IssuedAsset } from "@/lib/qubicWalletAnalyzer";

interface AdvancedWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: WalletAnalysisResult | null | undefined;
  isLoading: boolean;
  address: string;
}

function StatCard({ label, value, icon: Icon, className = "" }: { label: string; value: string | number; icon?: React.ElementType; className?: string }) {
  return (
    <div className={`p-3 rounded-lg bg-background/50 border border-border ${className}`}>
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="font-mono font-semibold text-foreground">{typeof value === 'number' ? value.toLocaleString() : value}</p>
    </div>
  );
}

function AssetItem({ name, amount }: { name: string; amount: string | number }) {
  return (
    <div className="flex items-center justify-between p-2 rounded bg-background/30 border border-border/50">
      <Badge variant="outline" className="border-primary/30 text-primary">{name || 'Unknown'}</Badge>
      <span className="font-mono text-sm">{typeof amount === 'number' ? amount.toLocaleString() : amount}</span>
    </div>
  );
}

export function AdvancedWalletDialog({ open, onOpenChange, data, isLoading, address }: AdvancedWalletDialogProps) {
  const hasStats = data?.statistics && Object.keys(data.statistics).length > 0;
  const stats = hasStats ? data.statistics as WalletStatistics : null;

  const ownedAssets = data?.additional_data?.owned_assets && !('error' in data.additional_data.owned_assets)
    ? data.additional_data.owned_assets.ownedAssets || []
    : [];

  const possessedAssets = data?.additional_data?.possessed_assets && !('error' in data.additional_data.possessed_assets)
    ? data.additional_data.possessed_assets.possessedAssets || []
    : [];

  const issuedAssets = data?.additional_data?.issued_assets && !('error' in data.additional_data.issued_assets)
    ? data.additional_data.issued_assets.issuedAssets || []
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Advanced Wallet Details
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Fetching wallet data from Qubic RPC...</p>
          </div>
        ) : data ? (
          <ScrollArea className="max-h-[65vh] pr-4">
            <div className="space-y-6">
              {/* Address */}
              <div>
                <p className="text-sm text-muted-foreground mb-1">Wallet Address</p>
                <p className="font-mono text-xs break-all bg-background/50 p-2 rounded border border-border">
                  {address}
                </p>
              </div>

              {/* Network Status */}
              <div className="flex items-center gap-2">
                {data.valid && stats ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-500">Connected to Qubic Network</span>
                    {data.network_info.latest_tick && (
                      <Badge variant="secondary" className="ml-auto">
                        Tick #{data.network_info.latest_tick.toLocaleString()}
                      </Badge>
                    )}
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-destructive" />
                    <span className="text-sm text-destructive">
                      {data.error || 'Failed to fetch wallet data'}
                    </span>
                  </>
                )}
              </div>

              <Separator />

              {/* Balance & Statistics */}
              {stats && (
                <>
                  <div>
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Wallet className="w-4 h-4" />
                      Balance & Statistics
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <StatCard 
                        label="Current Balance" 
                        value={`${stats.balance.toLocaleString()} QUBIC`} 
                        icon={Wallet}
                        className="col-span-2 bg-primary/5 border-primary/20"
                      />
                      <StatCard label="Valid for Tick" value={stats.valid_for_tick || 'N/A'} />
                      <StatCard label="Total Transfers" value={stats.total_transfers} />
                    </div>
                  </div>

                  <Separator />

                  {/* Incoming */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-green-500">
                      <TrendingDown className="w-4 h-4" />
                      Incoming Transfers
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <StatCard label="Total Amount" value={`${stats.incoming_amount.toLocaleString()} QUBIC`} />
                      <StatCard label="Transfer Count" value={stats.number_of_incoming_transfers} />
                      <StatCard label="Latest Tick" value={stats.latest_incoming_transfer_tick || 'N/A'} className="col-span-2" />
                    </div>
                  </div>

                  <Separator />

                  {/* Outgoing */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-orange-500">
                      <TrendingUp className="w-4 h-4" />
                      Outgoing Transfers
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <StatCard label="Total Amount" value={`${stats.outgoing_amount.toLocaleString()} QUBIC`} />
                      <StatCard label="Transfer Count" value={stats.number_of_outgoing_transfers} />
                      <StatCard label="Latest Tick" value={stats.latest_outgoing_transfer_tick || 'N/A'} className="col-span-2" />
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Owned Assets */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Owned Assets
                  <Badge variant="secondary">{ownedAssets.length}</Badge>
                </h4>
                {ownedAssets.length > 0 ? (
                  <div className="space-y-2">
                    {ownedAssets.map((asset: OwnedAsset, idx: number) => (
                      <AssetItem 
                        key={idx} 
                        name={asset.data?.issuedAsset?.name || 'Unknown'} 
                        amount={Number(asset.data?.numberOfUnits || 0)} 
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No owned assets</p>
                )}
              </div>

              {/* Possessed Assets */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Possessed Assets
                  <Badge variant="secondary">{possessedAssets.length}</Badge>
                </h4>
                {possessedAssets.length > 0 ? (
                  <div className="space-y-2">
                    {possessedAssets.map((asset: PossessedAsset, idx: number) => (
                      <AssetItem 
                        key={idx} 
                        name={asset.data?.possessedAsset?.name || 'Unknown'} 
                        amount={Number(asset.data?.numberOfUnits || 0)} 
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No possessed assets</p>
                )}
              </div>

              {/* Issued Assets */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Issued Assets
                  <Badge variant="secondary">{issuedAssets.length}</Badge>
                </h4>
                {issuedAssets.length > 0 ? (
                  <div className="space-y-2">
                    {issuedAssets.map((asset: IssuedAsset, idx: number) => (
                      <AssetItem 
                        key={idx} 
                        name={asset.data?.issuedAsset?.name || 'Unknown'} 
                        amount={Number(asset.data?.issuedAsset?.numberOfUnits || 0)} 
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No issued assets</p>
                )}
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Failed to load wallet details. Please try again.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
