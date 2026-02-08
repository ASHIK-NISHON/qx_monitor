import { useState, useMemo, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { toast } from "@/hooks/use-toast";
import { KPICard } from "@/components/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  Wallet,
  Fish,
  Sparkles,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from "lucide-react";
import { shortenAddress } from "@/data/events";
import { EventDetailDialog } from "@/components/EventDetailDialog";
import { useWhaleDetection, parseAmount } from "@/hooks/useWhaleDetection";
import { useAllQxEvents } from "@/hooks/useQxEvents";
import { useKPIStats } from "@/hooks/useKPIStats";
import { useUniqueTokens } from "@/hooks/useUniqueTokens";
import { DisplayEvent } from "@/types/qxEvent";
import { EventsOverTimeChart } from "@/components/EventsOverTimeChart";

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

export default function Overview() {
  const [selectedEvent, setSelectedEvent] = useState<DisplayEvent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tokenFilter, setTokenFilter] = useState("all-tokens");
  const [typeFilter, setTypeFilter] = useState("all-types");
  const [timeFilter, setTimeFilter] = useState("all");
  const { isWhale, whaleThresholds } = useWhaleDetection();
  const prevWhaleCountRef = useRef<number | null>(null);
  const uniqueTokens = useUniqueTokens();

  // Fetch ALL events so the Events Over Time chart and filters show full history (not capped at 1000)
  const { data: events = [], isLoading: eventsLoading } = useAllQxEvents();
  const { data: kpiStats } = useKPIStats();

  // Detect whale events
  const detectWhaleInEvent = (event: DisplayEvent): boolean => {
    const amount = parseAmount(event.amount);
    return isWhale(event.token, amount);
  };

  // Find whale events based on current thresholds
  const whaleEvents = useMemo(() => {
    return events.filter((e) => detectWhaleInEvent(e));
  }, [events, whaleThresholds]);

  // Get the most recent whale OR highest volume event with amount >= 10000
  const { displayWhale, isActualWhale } = useMemo(() => {
    if (whaleEvents.length > 0) {
      return { displayWhale: whaleEvents[0], isActualWhale: true };
    }
    
    // Fallback: find highest volume event with amount >= 10000
    const highVolumeEvents = events
      .filter((e) => {
        const amount = parseAmount(e.amount);
        return amount >= 10000;
      })
      .sort((a, b) => parseAmount(b.amount) - parseAmount(a.amount));
    
    if (highVolumeEvents.length > 0) {
      return { displayWhale: highVolumeEvents[0], isActualWhale: false };
    }
    
    return { displayWhale: null, isActualWhale: false };
  }, [events, whaleEvents]);

  const handleEventClick = (event: DisplayEvent) => {
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  // Filter events based on search and filters
  const filteredEvents = events.filter((event) => {
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      const matchesFrom = event.from.toLowerCase().includes(query);
      const matchesTo = event.to.toLowerCase().includes(query);
      const matchesTick = event.tickNo.replace(/,/g, "").includes(query.replace(/,/g, ""));
      const matchesToken = event.token.toLowerCase().includes(query);
      if (!matchesFrom && !matchesTo && !matchesTick && !matchesToken) {
        return false;
      }
    }

    // Token filter
    if (tokenFilter !== "all-tokens") {
      if (event.token.toUpperCase() !== tokenFilter.toUpperCase()) {
        return false;
      }
    }

    if (typeFilter !== "all-types") {
      if (typeFilter === "whale") {
        if (!detectWhaleInEvent(event)) {
          return false;
        }
      } else {
        const typeMap: Record<string, string> = {
          bid: "AddToBidOrder",
          ask: "AddToAskOrder",
          transfer: "TransferShareOwnershipAndPossession",
          issue: "IssueAsset",
        };
        if (event.type !== typeMap[typeFilter]) {
          return false;
        }
      }
    }

    if (timeFilter !== "all") {
      const time = event.time.toLowerCase();
      if (timeFilter === "1h" && !time.includes("min") && !time.includes("just")) {
        return false;
      } else if (timeFilter === "24h" && (time.includes("day") || time.includes("week"))) {
        return false;
      }
    }

    return true;
  });

  // Filtered whale events (matches the current filters/search)
  const filteredWhaleEvents = useMemo(() => {
    return filteredEvents.filter((event) => detectWhaleInEvent(event));
  }, [filteredEvents, detectWhaleInEvent]);

  // Show toast notification when whale events are detected in the current view
  useEffect(() => {
    const currentCount = filteredWhaleEvents.length;
    
    if (prevWhaleCountRef.current !== null && currentCount > 0 && currentCount !== prevWhaleCountRef.current) {
      toast({
        title: "🐋 Whale Activity Detected!",
        description: `${currentCount} whale event${currentCount > 1 ? 's' : ''} found in your current filters and thresholds.`,
      });
    }
    
    prevWhaleCountRef.current = currentCount;
  }, [filteredWhaleEvents.length, whaleThresholds]);

  // Show more live events to better fill the list
  const liveEvents = filteredEvents.slice(0, 15);

  // Get unique tokens from events for top wallets calculation
  const topWallets = useMemo(() => {
    const walletVolumes = new Map<string, number>();
    events.forEach((event) => {
      const amount = parseAmount(event.amount);
      const current = walletVolumes.get(event.from) || 0;
      walletVolumes.set(event.from, current + amount);
    });
    
    return Array.from(walletVolumes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([address, volume]) => ({
        address,
        volume: volume >= 1000000 ? `${(volume / 1000000).toFixed(1)}M` : 
                volume >= 1000 ? `${(volume / 1000).toFixed(0)}K` : 
                volume.toLocaleString(),
      }));
  }, [events]);

  const kpiData = [
    {
      title: "Total Events",
      value: kpiStats?.totalEvents?.toLocaleString() || "0",
      trend: kpiStats ? {
        value: kpiStats.totalEvents24h > 0 
          ? Math.round((kpiStats.totalEvents24h / kpiStats.totalEvents) * 100) 
          : 0,
        isPositive: true
      } : undefined,
      icon: Activity,
    },
    {
      title: "Active Wallets",
      value: kpiStats?.activeWallets?.toLocaleString() || "0",
      trend: kpiStats ? {
        value: kpiStats.activeWallets > 0 
          ? Math.round((kpiStats.activeWallets24h / kpiStats.activeWallets) * 100) 
          : 0,
        isPositive: true
      } : undefined,
      icon: Wallet,
    },
    {
      title: "Whales Detected",
      value: kpiStats?.whalesDetected?.toLocaleString() || "0",
      trend: kpiStats ? {
        value: kpiStats.whalesDetected > 0 
          ? Math.round((kpiStats.whalesDetected24h / kpiStats.whalesDetected) * 100) 
          : 0,
        isPositive: true
      } : undefined,
      icon: Fish,
    },
    {
      title: "Total Volume",
      value: kpiStats?.totalVolume ? 
        (kpiStats.totalVolume >= 1000000000 ? 
          `${(kpiStats.totalVolume / 1000000000).toFixed(2)}B` :
          kpiStats.totalVolume >= 1000000 ? 
          `${(kpiStats.totalVolume / 1000000).toFixed(1)}M` : 
          kpiStats.totalVolume >= 1000 ?
          `${(kpiStats.totalVolume / 1000).toFixed(1)}K` :
          kpiStats.totalVolume.toLocaleString()) : "0",
      trend: kpiStats ? {
        value: kpiStats.totalVolume > 0 
          ? Math.round((kpiStats.totalVolume24h / kpiStats.totalVolume) * 100) 
          : 0,
        isPositive: true
      } : undefined,
      icon: Sparkles,
    },
  ];

  return (
    <DashboardLayout title="Overview">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {kpiData.map((kpi, idx) => (
          <KPICard key={idx} {...kpi} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Events Feed - Takes 2 columns */}
        <Card className="lg:col-span-2 gradient-card border-border">
          <CardHeader>
            <CardTitle className="text-xl">Live QX Events</CardTitle>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 mt-4">
              <div className="flex-1 min-w-0 sm:min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search address, token, or tick no..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-background/50 border-border text-sm"
                  />
                </div>
              </div>
              <Select value={tokenFilter} onValueChange={setTokenFilter}>
                <SelectTrigger className="w-full sm:w-[140px] bg-background/50 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="all-tokens">All Tokens</SelectItem>
                  {uniqueTokens.map((token) => (
                    <SelectItem key={token} value={token.toLowerCase()}>
                      {token}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[140px] bg-background/50 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-types">All Types</SelectItem>
                  <SelectItem value="whale">🐋 Whale</SelectItem>
                  <SelectItem value="bid">Bid Order</SelectItem>
                  <SelectItem value="ask">Ask Order</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="issue">Issue Asset</SelectItem>
                </SelectContent>
              </Select>
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-full sm:w-[120px] bg-background/50 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="1h">Last 1h</SelectItem>
                  <SelectItem value="24h">Last 24h</SelectItem>
                  <SelectItem value="7d">Last 7d</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : liveEvents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No events yet. Waiting for data from qx...
              </div>
            ) : (
              <div className="space-y-3">
                {liveEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => handleEventClick(event)}
                    className="flex flex-col md:flex-row md:items-center md:justify-between p-3 md:p-4 rounded-lg bg-background/30 border border-border hover:border-primary/30 transition-smooth cursor-pointer gap-3 md:gap-4"
                  >
                    <div className="flex flex-wrap items-center gap-2 md:gap-4 flex-1 min-w-0">
                      <Badge variant={getEventBadgeVariant(event.type)} className="flex-shrink-0">
                        {getEventTypeLabel(event.type)}
                      </Badge>
                      {detectWhaleInEvent(event) && (
                        <Badge
                          variant="outline"
                          className="text-xs border-amber-500/50 text-amber-500 bg-amber-500/10 flex-shrink-0"
                        >
                          🐋 Whale
                        </Badge>
                      )}
                      <span className="font-mono text-xs md:text-sm text-muted-foreground flex-shrink-0">
                        {event.token}
                      </span>
                      <div className="flex items-center gap-1 md:gap-2 text-xs md:text-sm min-w-0">
                        <span className="font-mono text-foreground truncate">
                          {shortenAddress(event.from)}
                        </span>
                        {event.type === "AddToBidOrder" ? (
                          <ArrowUpRight className="w-3 h-3 md:w-4 md:h-4 text-success flex-shrink-0" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <span className="font-mono text-foreground truncate">
                          {shortenAddress(event.to)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-4 justify-between md:justify-end flex-wrap md:flex-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground md:hidden">Amount</span>
                        <span className="font-mono text-sm md:text-base font-semibold text-foreground">
                          {event.amount}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 text-right">
                        <span className="text-xs text-muted-foreground md:hidden">Time</span>
                        <span className="text-xs md:text-sm text-muted-foreground">
                          {event.time}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-[10px] md:text-[11px] uppercase tracking-wide text-muted-foreground">
                          Tick
                        </span>
                        <Badge
                          variant="outline"
                          className="text-xs border-primary/30 text-primary whitespace-nowrap"
                        >
                          {event.tickNo}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column - Charts and Stats */}
        <div className="space-y-6">
          {/* Events Chart */}
          <Card className="gradient-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Events Over Time</CardTitle>
              <p className="text-sm text-muted-foreground">Track event patterns over time</p>
            </CardHeader>
            <CardContent>
              <EventsOverTimeChart events={events} />
            </CardContent>
          </Card>

          {/* Top Wallets */}
          <Card className="gradient-card border-border">
            <CardHeader>
              <CardTitle className="text-lg">Top 5 Wallets</CardTitle>
              <p className="text-sm text-muted-foreground">By volume</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topWallets.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    No wallet data yet
                  </div>
                ) : (
                  topWallets.map((wallet, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col md:flex-row md:items-center md:justify-between p-3 rounded-lg bg-background/30 border border-border gap-2"
                    >
                      <span className="font-mono text-sm text-foreground break-all md:break-normal">
                        {shortenAddress(wallet.address)}
                      </span>
                      <span className="font-mono font-semibold text-primary flex-shrink-0">
                        {wallet.volume}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Whale Event */}
          {displayWhale && (
            <Card
              onClick={() => handleEventClick(displayWhale)}
              className={`gradient-card border-border cursor-pointer hover:border-primary/40 transition-smooth ${
                isActualWhale ? "border-primary/20 glow-primary" : "border-amber-500/20"
              }`}
            >
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Fish className={`w-5 h-5 ${isActualWhale ? "text-primary" : "text-amber-500"}`} />
                  {isActualWhale ? "Most Recent Whale" : "Highest Volume Event"}
                </CardTitle>
                {!isActualWhale && (
                  <p className="text-xs text-muted-foreground mt-1">
                    No whale detected. Showing highest volume event.
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex flex-col md:flex-row md:justify-between gap-1 md:gap-0">
                    <span className="text-sm text-muted-foreground">Wallet</span>
                    <span className="font-mono text-sm text-foreground break-all md:break-normal">
                      {shortenAddress(displayWhale.from)}
                    </span>
                  </div>
                  <div className="flex flex-col md:flex-row md:justify-between gap-1 md:gap-0">
                    <span className="text-sm text-muted-foreground">Type</span>
                    <Badge variant="default">{getEventTypeLabel(displayWhale.type)}</Badge>
                  </div>
                  <div className="flex flex-col md:flex-row md:justify-between gap-1 md:gap-0">
                    <span className="text-sm text-muted-foreground">Amount</span>
                    <span className="font-mono font-semibold text-primary">
                      {displayWhale.amount}
                    </span>
                  </div>
                  <div className="flex flex-col md:flex-row md:justify-between gap-1 md:gap-0">
                    <span className="text-sm text-muted-foreground">Time</span>
                    <span className="text-sm text-foreground">{displayWhale.time}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <EventDetailDialog
        event={selectedEvent}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </DashboardLayout>
  );
}
