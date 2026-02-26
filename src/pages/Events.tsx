import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, ArrowUpRight, ArrowDownRight, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { shortenAddress } from "@/data/events";
import { EventDetailDialog } from "@/components/EventDetailDialog";
import { useWhaleDetection, parseAmount } from "@/hooks/useWhaleDetection";
import { useQxEvents, useSearchQxEvents, useTotalEventsCount, useFilteredEventsCount, useAllQxEvents } from "@/hooks/useQxEvents";
import { useUniqueTokens } from "@/hooks/useUniqueTokens";
import { DisplayEvent } from "@/types/qxEvent";

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

export default function Events() {
  const [selectedEvent, setSelectedEvent] = useState<DisplayEvent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tokenFilter, setTokenFilter] = useState("all-tokens");
  const [typeFilter, setTypeFilter] = useState("all-types");
  const [timeFilter, setTimeFilter] = useState("all");
  const [pageIndex, setPageIndex] = useState(0);
  const { isWhale } = useWhaleDetection();
  const uniqueTokens = useUniqueTokens();

  const pageSize = 50;

  // Detect whale helper function
  const detectWhaleInEvent = (event: DisplayEvent): boolean => {
    const amount = parseAmount(event.amount);
    return isWhale(event.token, amount);
  };

  const isWhaleFilterActive = typeFilter === "whale";
  const isTimeFilterActive = timeFilter !== "all";

  // Check if user is searching or filtering (including time filter)
  const hasSearchOrFilter = Boolean(
    searchQuery.trim() ||
    tokenFilter !== "all-tokens" ||
    typeFilter !== "all-types" ||
    isTimeFilterActive
  );
  
  // Whale filter is client-side only, so we shouldn't use search hook for it
  const hasServerFilter = Boolean(
    searchQuery.trim() ||
    tokenFilter !== "all-tokens" ||
    (typeFilter !== "all-types" && !isWhaleFilterActive)
  );

  // If time filter is active without server-side filters, or whale filter is active,
  // we need all events for client-side filtering
  const needsAllEvents = isWhaleFilterActive || (isTimeFilterActive && !hasServerFilter);

  // Get counts
  const { data: totalCount = 0, isLoading: countLoading } = useTotalEventsCount();
  const { data: filteredCount = 0 } = useFilteredEventsCount(searchQuery, tokenFilter, typeFilter !== 'whale' ? typeFilter : 'all-types');

  // Get events - use all events when whale filter or time filter (without server filters) is active
  const paginationResults = useQxEvents(pageIndex, pageSize);
  const searchResults = useSearchQxEvents(searchQuery, tokenFilter, typeFilter !== 'whale' ? typeFilter : 'all-types', pageIndex, pageSize);
  const allEventsResult = useAllQxEvents();

  // Choose which data to use
  let events: DisplayEvent[] = [];
  let isLoading = false;
  
  if (needsAllEvents) {
    // When whale filter or time filter (without server filters) is active, fetch all events for client-side filtering
    events = allEventsResult.data || [];
    isLoading = allEventsResult.isLoading;
  } else {
    // Otherwise use paginated or search results
    const result = hasServerFilter ? searchResults : paginationResults;
    events = result.data || [];
    isLoading = result.isLoading;
  }

  // When using all events, server-side filters (search/token/type) have not been applied yet
  const hasServerAppliedFilters = !needsAllEvents && hasServerFilter;

  // Reset page to 0 when filters change
  useEffect(() => {
    setPageIndex(0);
  }, [searchQuery, tokenFilter, typeFilter]);

  // Determine if we need client-side filtering/pagination
  const needsClientSideFiltering = isWhaleFilterActive || isTimeFilterActive;
  const needsClientSidePagination = needsAllEvents;

  // Filter events based on search, token, time, and whale filters (client-side)
  let filteredEvents = events.filter((event) => {
    // Search filter (if not already applied server-side)
    if (!hasServerAppliedFilters && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const matchesFrom = event.from.toLowerCase().includes(query);
      const matchesTo = event.to.toLowerCase().includes(query);
      const matchesTick = event.tickNo.replace(/,/g, "").includes(query.replace(/,/g, ""));
      const matchesToken = event.token.toLowerCase().includes(query);
      if (!matchesFrom && !matchesTo && !matchesTick && !matchesToken) {
        return false;
      }
    }

    // Token filter (if not already applied server-side)
    if (!hasServerAppliedFilters && tokenFilter !== "all-tokens") {
      const filterToken = String(tokenFilter).toUpperCase();
      if (event.token.toUpperCase() !== filterToken) {
        return false;
      }
    }

    // Whale filter (client-side detection)
    if (typeFilter === 'whale') {
      if (!detectWhaleInEvent(event)) {
        return false;
      }
    }

    // Time filter (client-side only)
    if (timeFilter !== "all") {
      const time = event.time.toLowerCase();
      if (timeFilter === "1h") {
        if (!time.includes("min") && !time.includes("just")) {
          return false;
        }
      } else if (timeFilter === "24h") {
        if (time.includes("day") || time.includes("week")) {
          return false;
        }
      } else if (timeFilter === "7d") {
        if (time.includes("week") || time.includes("month")) {
          return false;
        }
      } else if (timeFilter === "30d") {
        if (time.includes("month")) {
          return false;
        }
      }
    }

    return true;
  });

  // Sort filtered events by created_at descending (most recent first) - only if client-side filtering
  if (needsClientSideFiltering) {
    filteredEvents = filteredEvents.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA;
    });
  }

  // Paginate the filtered results - only if we need client-side pagination
  // If server-side pagination is used and no client-side filters, use events directly
  const paginatedEvents = needsClientSidePagination 
    ? filteredEvents.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
    : filteredEvents;

  // Calculate total pages and display count
  let displayCount = hasServerFilter ? filteredCount : totalCount;
  
  // If whale filter or time filter (without server filters) is applied, we filter client-side, so use filtered count
  if (needsAllEvents) {
    displayCount = filteredEvents.length;
  } else if (isTimeFilterActive && hasServerFilter) {
    // Time filter with server filters - approximate count (may be inaccurate)
    // Could be improved by fetching all events, but for now use filtered count
    displayCount = filteredEvents.length;
  }
  
  const totalPages = Math.ceil(displayCount / pageSize);

  const handleEventClick = (event: DisplayEvent) => {
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  return (
    <DashboardLayout title="Events">
      <Card className="gradient-card border-border">
        <CardHeader>
          <CardTitle className="text-xl">
            QX Events History
            <span className="text-sm font-normal text-muted-foreground ml-2">
              (Total: {countLoading ? '...' : totalCount.toLocaleString()} events)
            </span>
            {hasSearchOrFilter && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                • {displayCount.toLocaleString()} results
              </span>
            )}
          </CardTitle>
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
                  <SelectItem key={token} value={token}>
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
                <SelectItem value="cancelAsk">Cancel Ask</SelectItem>
                <SelectItem value="cancelBid">Cancel Bid</SelectItem>
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
                <SelectItem value="30d">Last 30d</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : paginatedEvents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {totalCount === 0 ? (
                "No events found. Waiting for data from qx..."
              ) : pageIndex >= totalPages ? (
                "No more events on this page. Please go back to previous pages."
              ) : (
                "No events found matching your filters."
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead>Type</TableHead>
                      <TableHead>Token</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead>Tick no</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedEvents.map((event) => (
                      <TableRow
                        key={event.id}
                        className="border-border hover:bg-background/30 transition-smooth cursor-pointer"
                        onClick={() => handleEventClick(event)}
                      >
                        <TableCell>
                          <Badge variant={getEventBadgeVariant(event.type)}>
                            {getEventTypeLabel(event.type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {event.token}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {shortenAddress(event.from)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {event.type === "AddToBidOrder" ? (
                              <ArrowUpRight className="w-4 h-4 text-success" />
                            ) : (
                              <ArrowDownRight className="w-4 h-4 text-muted-foreground" />
                            )}
                            <span className="font-mono text-sm">{shortenAddress(event.to)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono font-semibold">
                          {event.amount}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex flex-col">
                            <span className="text-muted-foreground">{event.time}</span>
                            <span className="text-xs text-muted-foreground/60">
                              {event.timestamp}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {detectWhaleInEvent(event) ? (
                            <Badge
                              variant="outline"
                              className="text-xs border-amber-500/50 text-amber-500 bg-amber-500/10"
                            >
                              🐋 Whale
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs text-foreground">
                            {event.tickNo}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {paginatedEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => handleEventClick(event)}
                    className="p-4 rounded-lg bg-background/30 border border-border hover:border-primary/30 transition-smooth cursor-pointer space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={getEventBadgeVariant(event.type)} className="text-xs">
                          {getEventTypeLabel(event.type)}
                        </Badge>
                        {detectWhaleInEvent(event) && (
                          <Badge
                            variant="outline"
                            className="text-xs border-amber-500/50 text-amber-500 bg-amber-500/10"
                          >
                            🐋 Whale
                          </Badge>
                        )}
                        <span className="font-mono text-xs text-muted-foreground">
                          {event.token}
                        </span>
                      </div>
                      <span className="font-mono text-xs text-foreground">
                        {event.tickNo}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">From:</span>
                        <span className="font-mono text-foreground">{shortenAddress(event.from)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">To:</span>
                        <div className="flex items-center gap-1">
                          {event.type === "AddToBidOrder" ? (
                            <ArrowUpRight className="w-3 h-3 text-success" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3 text-muted-foreground" />
                          )}
                          <span className="font-mono text-foreground">{shortenAddress(event.to)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Amount:</span>
                        <span className="font-mono font-semibold text-foreground">{event.amount}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Time:</span>
                        <span className="text-foreground">{event.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination (show if there are events or we're not on first page) */}
              {(displayCount > 0 || pageIndex > 0) && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setPageIndex(Math.max(0, pageIndex - 1))}
                      disabled={pageIndex === 0}
                      className="gap-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => setPageIndex(pageIndex + 1)}
                      disabled={pageIndex >= totalPages - 1}
                      className="gap-2"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-4 text-sm text-muted-foreground">
                    <div className="text-center">
                      <span className="font-semibold text-foreground">
                        {(pageIndex * pageSize + 1).toLocaleString()} - {Math.min((pageIndex + 1) * pageSize, displayCount).toLocaleString()}
                      </span>
                      <span> of </span>
                      <span className="font-semibold text-foreground">{displayCount.toLocaleString()}</span>
                    </div>
                    <div className="hidden sm:block text-muted-foreground">•</div>
                    <div className="text-center">
                      Page <span className="font-semibold text-foreground">{pageIndex + 1}</span>
                      <span> of </span>
                      <span className="font-semibold text-foreground">{totalPages}</span>
                    </div>
                    <div className="hidden sm:block text-muted-foreground">•</div>
                    <div className="text-center">
                      <span className="font-semibold text-foreground">{pageSize}</span>
                      <span> events per page</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <EventDetailDialog
        event={selectedEvent}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </DashboardLayout>
  );
}
