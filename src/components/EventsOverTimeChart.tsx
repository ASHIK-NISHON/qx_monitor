import { useMemo, useState } from "react";
import { DisplayEvent } from "@/types/qxEvent";
import { parseAmount } from "@/hooks/useWhaleDetection";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface EventsOverTimeChartProps {
  events: DisplayEvent[];
}

interface TimeSlot {
  hour: string;
  dateLabel: string;
  total: number;
  bidOrders: number;
  askOrders: number;
  transfers: number;
  issues: number;
  cancels: number;
  mgmtTransfers: number;
  other: number;
  volume: number;
  startTime: Date;
  endTime: Date;
}

type TimeRange = "all" | "7d" | "24h" | "12h" | "6h" | "1h";

const ACTION_COLORS = {
  bidOrders: "from-emerald-500 to-emerald-400",
  askOrders: "from-rose-500 to-rose-400",
  transfers: "from-violet-500 to-violet-400",
  issues: "from-amber-500 to-amber-400",
  cancels: "from-slate-500 to-slate-400",
  mgmtTransfers: "from-cyan-500 to-cyan-400",
};

const ACTION_LABELS = {
  bidOrders: "Bid Orders",
  askOrders: "Ask Orders",
  transfers: "Transfers",
  issues: "Issue Assets",
  cancels: "Cancellations",
  mgmtTransfers: "Mgmt Transfers",
};

export function EventsOverTimeChart({ events }: EventsOverTimeChartProps) {
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);
  const [selectedView, setSelectedView] = useState<"activity" | "volume">("activity");
  const [timeRange, setTimeRange] = useState<TimeRange>("all");

  // Debug: Count event types and total
  if (events.length > 0) {
    const typeCounts = new Map<string, number>();
    events.forEach((e) => {
      typeCounts.set(e.type, (typeCounts.get(e.type) || 0) + 1);
    });
    console.log(`Chart received ${events.length} events. Types:`, Array.from(typeCounts.entries()));
  }

  // Safely parse timestamps (supports raw ms, seconds, numeric strings, and "YYYY-MM-DD HH:mm:ss")
  const getEventDate = (evt: DisplayEvent) => {
    // Prefer raw millisecond timestamp when provided
    if (typeof (evt as any).timestampMs === "number" && Number.isFinite((evt as any).timestampMs)) {
      return new Date((evt as any).timestampMs);
    }

    // Next, try numeric timestamp in the timestamp field
    if (typeof evt.timestamp === "number" && Number.isFinite(evt.timestamp)) {
      const ms = evt.timestamp < 1e12 ? evt.timestamp * 1000 : evt.timestamp;
      return new Date(ms);
    }

    // If timestamp is a string, normalize and parse
    if (typeof evt.timestamp === "string") {
      // Try numeric string first
      const numeric = Number(evt.timestamp);
      if (Number.isFinite(numeric)) {
        const ms = numeric < 1e12 ? numeric * 1000 : numeric;
        return new Date(ms);
      }

      // Handle "YYYY-MM-DD HH:mm:ss" by converting to ISO
      const normalized =
        evt.timestamp.includes(" ") && !evt.timestamp.includes("T")
          ? `${evt.timestamp.replace(" ", "T")}Z`
          : evt.timestamp;

      const parsed = Date.parse(normalized);
      if (!Number.isNaN(parsed)) {
        return new Date(parsed);
      }
    }

    // Fallback: now (avoids dropping events if format is unexpected)
    return new Date();
  };

  // Get the oldest and newest event timestamps
  const { oldestTime, newestTime } = useMemo(() => {
    if (events.length === 0) {
      const now = new Date();
      return { oldestTime: now, newestTime: now };
    }
    
    const validTimestamps = events
      .map((e) => ({ evt: e, time: getEventDate(e).getTime() }))
      .filter(x => Number.isFinite(x.time) && x.time > 0)
      .map(x => x.time);
    
    if (validTimestamps.length === 0) {
      const now = new Date();
      return { oldestTime: now, newestTime: now };
    }
    
    return {
      oldestTime: new Date(Math.min(...validTimestamps)),
      newestTime: new Date(Math.max(...validTimestamps)),
    };
  }, [events]);

  const timeSlots = useMemo(() => {
    const slots: TimeSlot[] = [];
    const now = new Date();
    let startTime: Date;
    let endTime: Date = now;
    let slotCount: number;
    let slotDuration: number; // in milliseconds

    // Calculate time range based on selection
    if (timeRange === "all") {
      startTime = oldestTime;
      endTime = newestTime;
      const totalDuration = endTime.getTime() - startTime.getTime();
      
      // Determine slot count and duration based on total time range
      if (totalDuration <= 24 * 60 * 60 * 1000) {
        // Less than 24 hours: use 1-hour slots
        slotDuration = 60 * 60 * 1000;
        slotCount = Math.max(12, Math.ceil(totalDuration / slotDuration));
      } else if (totalDuration <= 7 * 24 * 60 * 60 * 1000) {
        // Less than 7 days: use 6-hour slots
        slotDuration = 6 * 60 * 60 * 1000;
        slotCount = Math.max(12, Math.ceil(totalDuration / slotDuration));
      } else if (totalDuration <= 30 * 24 * 60 * 60 * 1000) {
        // Less than 30 days: use 1-day slots
        slotDuration = 24 * 60 * 60 * 1000;
        slotCount = Math.max(12, Math.ceil(totalDuration / slotDuration));
      } else {
        // More than 30 days: use 7-day slots
        slotDuration = 7 * 24 * 60 * 60 * 1000;
        slotCount = Math.max(12, Math.ceil(totalDuration / slotDuration));
      }
    } else {
      // Preset ranges
      const rangeMap: Record<TimeRange, number> = {
        "1h": 60 * 60 * 1000,
        "6h": 6 * 60 * 60 * 1000,
        "12h": 12 * 60 * 60 * 1000,
        "24h": 24 * 60 * 60 * 1000,
        "7d": 7 * 24 * 60 * 60 * 1000,
        "all": 0,
      };
      
      const rangeDuration = rangeMap[timeRange];
      startTime = new Date(now.getTime() - rangeDuration);
      endTime = now;
      
      // Determine slot count and duration based on range
      if (timeRange === "1h") {
        slotCount = 12;
        slotDuration = 5 * 60 * 1000; // 5-minute slots
      } else if (timeRange === "6h") {
        slotCount = 12;
        slotDuration = 30 * 60 * 1000; // 30-minute slots
      } else if (timeRange === "12h") {
        slotCount = 12;
        slotDuration = 60 * 60 * 1000; // 1-hour slots
      } else if (timeRange === "24h") {
        slotCount = 12;
        slotDuration = 2 * 60 * 60 * 1000; // 2-hour slots
      } else {
        slotCount = 7;
        slotDuration = 24 * 60 * 60 * 1000; // 1-day slots
      }
    }

    // Use calculated slot count and duration
    const effectiveSlotCount = slotCount;
    const effectiveSlotDuration = slotDuration;

    // Create time slots
    for (let i = effectiveSlotCount - 1; i >= 0; i--) {
      const slotEnd = new Date(endTime.getTime() - i * effectiveSlotDuration);
      const slotStart = new Date(slotEnd.getTime() - effectiveSlotDuration);

      const slotEvents = events.filter((event) => {
        const eventTime = getEventDate(event);
        // Include events that fall within the slot. For the final (most recent) slot
        // include events exactly equal to the slot end to avoid dropping the newest
        // event due to an exclusive end boundary.
        if (i === 0) {
          return eventTime >= slotStart && eventTime <= slotEnd;
        }
        return eventTime >= slotStart && eventTime < slotEnd;
      });

      const bidOrders = slotEvents.filter((e) => e.type === "AddToBidOrder").length;
      const askOrders = slotEvents.filter((e) => e.type === "AddToAskOrder").length;
      const transfers = slotEvents.filter((e) => e.type === "TransferShareOwnershipAndPossession").length;
      const issues = slotEvents.filter((e) => e.type === "IssueAsset").length;
      const cancels = slotEvents.filter(
        (e) => e.type === "RemoveFromAskOrder" || e.type === "RemoveFromBidOrder"
      ).length;
      const mgmtTransfers = slotEvents.filter((e) => e.type === "TransferShareManagementRights").length;
      
      // Count other event types
      const categorizedCount = bidOrders + askOrders + transfers + issues + cancels + mgmtTransfers;
      const other = slotEvents.length - categorizedCount;

      const volume = slotEvents.reduce((acc, e) => acc + parseAmount(e.amount), 0);
      const total = bidOrders + askOrders + transfers + issues + cancels + mgmtTransfers + other;

      // Format time label based on range
      let hourLabel: string;
      let dateLabel: string;
      
      if (timeRange === "all" && slotDuration >= 7 * 24 * 60 * 60 * 1000) {
        // Weekly slots
        hourLabel = slotEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        dateLabel = `${slotStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${slotEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
      } else if (timeRange === "all" && slotDuration >= 24 * 60 * 60 * 1000) {
        // Daily slots
        hourLabel = slotEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        dateLabel = slotEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      } else if (slotDuration >= 24 * 60 * 60 * 1000) {
        // Daily slots
        hourLabel = slotEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        dateLabel = slotEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      } else if (slotDuration >= 60 * 60 * 1000) {
        // Hourly slots
        hourLabel = slotEnd.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
        dateLabel = slotEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      } else {
        // Minute slots
        hourLabel = slotEnd.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
        dateLabel = slotEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      }

      slots.push({
        hour: hourLabel,
        dateLabel,
        total,
        bidOrders,
        askOrders,
        transfers,
        issues,
        cancels,
        mgmtTransfers,
        other,
        volume,
        startTime: slotStart,
        endTime: slotEnd,
      });
    }

    return slots;
  }, [events, timeRange, oldestTime, newestTime]);

  const maxTotal = Math.max(...timeSlots.map((s) => s.total), 1);
  const maxVolume = Math.max(...timeSlots.map((s) => s.volume), 1);

  const totalActivity = timeSlots.reduce((acc, s) => acc + s.total, 0);
  const totalBids = timeSlots.reduce((acc, s) => acc + s.bidOrders, 0);
  const totalAsks = timeSlots.reduce((acc, s) => acc + s.askOrders, 0);
  const totalTransfers = timeSlots.reduce((acc, s) => acc + s.transfers, 0);
  const totalIssues = timeSlots.reduce((acc, s) => acc + s.issues, 0);
  const totalCancels = timeSlots.reduce((acc, s) => acc + s.cancels, 0);
  const totalMgmtTransfers = timeSlots.reduce((acc, s) => acc + s.mgmtTransfers, 0);
  const totalOther = timeSlots.reduce((acc, s) => acc + s.other, 0);

  // Debug: Log the totals to see if they add up
  console.log(`Chart totals - Bids: ${totalBids}, Asks: ${totalAsks}, Transfers: ${totalTransfers}, Issues: ${totalIssues}, Cancels: ${totalCancels}, MgmtTransfers: ${totalMgmtTransfers}, Other: ${totalOther}, Total: ${totalActivity} (Events received: ${events.length})`);


  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedView("activity")}
            className={`px-3 py-1.5 text-xs rounded-md transition-all duration-300 ${
              selectedView === "activity"
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-background/50 text-muted-foreground hover:bg-background/80"
            }`}
          >
            Activity
          </button>
          <button
            onClick={() => setSelectedView("volume")}
            className={`px-3 py-1.5 text-xs rounded-md transition-all duration-300 ${
              selectedView === "volume"
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-background/50 text-muted-foreground hover:bg-background/80"
            }`}
          >
            Volume
          </button>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className="px-2 py-1.5 text-xs rounded-md bg-background/50 border border-border text-foreground hover:bg-background/80 transition-colors"
          >
            <option value="all">All Time</option>
            <option value="7d">Last 7 Days</option>
            <option value="24h">Last 24 Hours</option>
            <option value="12h">Last 12 Hours</option>
            <option value="6h">Last 6 Hours</option>
            <option value="1h">Last 1 Hour</option>
          </select>
        </div>

        <div className="text-xs text-muted-foreground">
          {totalActivity.toLocaleString()} events
        </div>
      </div>

      {/* Chart */}
      <TooltipProvider delayDuration={0}>
        <div className="h-36 flex items-end justify-between gap-1.5 relative">
          {/* Pulse indicator for live data */}
          <div className="absolute -top-1 -right-1 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Live</span>
          </div>

          {timeSlots.map((slot, idx) => {
            const isHovered = hoveredSlot === idx;
            const heightPercent = selectedView === "activity" 
              ? (slot.total / maxTotal) * 100
              : (slot.volume / maxVolume) * 100;

            // Calculate stacked segments for activity view
            const bidHeight = slot.total > 0 ? (slot.bidOrders / slot.total) * heightPercent : 0;
            const askHeight = slot.total > 0 ? (slot.askOrders / slot.total) * heightPercent : 0;
            const transferHeight = slot.total > 0 ? (slot.transfers / slot.total) * heightPercent : 0;
            const issueHeight = slot.total > 0 ? (slot.issues / slot.total) * heightPercent : 0;
            const cancelHeight = slot.total > 0 ? (slot.cancels / slot.total) * heightPercent : 0;
            const mgmtTransferHeight = slot.total > 0 ? (slot.mgmtTransfers / slot.total) * heightPercent : 0;
            const otherHeight = slot.total > 0 ? (slot.other / slot.total) * heightPercent : 0;

            return (
              <Tooltip key={idx}>
                <TooltipTrigger asChild>
                  <div
                    className="flex-1 flex flex-col justify-end cursor-pointer group relative"
                    style={{ height: "100%" }}
                    onMouseEnter={() => setHoveredSlot(idx)}
                    onMouseLeave={() => setHoveredSlot(null)}
                  >
                    {selectedView === "activity" ? (
                      // Stacked bar for activity
                      <div
                        className={`w-full rounded-t overflow-hidden transition-all duration-500 ease-out ${
                          isHovered ? "scale-x-110 shadow-lg" : ""
                        }`}
                        style={{
                          height: `${heightPercent}%`,
                          minHeight: slot.total > 0 ? "4px" : "0",
                          transitionProperty: "height, transform, box-shadow",
                        }}
                      >
                        {/* Stacked segments */}
                        <div className="w-full h-full flex flex-col-reverse">
                          {bidHeight > 0 && (
                            <div
                              className={`w-full bg-gradient-to-t ${ACTION_COLORS.bidOrders} transition-all duration-300`}
                              style={{ height: `${(bidHeight / heightPercent) * 100}%` }}
                            />
                          )}
                          {askHeight > 0 && (
                            <div
                              className={`w-full bg-gradient-to-t ${ACTION_COLORS.askOrders} transition-all duration-300`}
                              style={{ height: `${(askHeight / heightPercent) * 100}%` }}
                            />
                          )}
                          {transferHeight > 0 && (
                            <div
                              className={`w-full bg-gradient-to-t ${ACTION_COLORS.transfers} transition-all duration-300`}
                              style={{ height: `${(transferHeight / heightPercent) * 100}%` }}
                            />
                          )}
                          {issueHeight > 0 && (
                            <div
                              className={`w-full bg-gradient-to-t ${ACTION_COLORS.issues} transition-all duration-300`}
                              style={{ height: `${(issueHeight / heightPercent) * 100}%` }}
                            />
                          )}
                          {cancelHeight > 0 && (
                            <div
                              className={`w-full bg-gradient-to-t ${ACTION_COLORS.cancels} transition-all duration-300`}
                              style={{ height: `${(cancelHeight / heightPercent) * 100}%` }}
                            />
                          )}
                          {mgmtTransferHeight > 0 && (
                            <div
                              className={`w-full bg-gradient-to-t ${ACTION_COLORS.mgmtTransfers} transition-all duration-300`}
                              style={{ height: `${(mgmtTransferHeight / heightPercent) * 100}%` }}
                            />
                          )}
                          {otherHeight > 0 && (
                            <div
                              className="w-full bg-gradient-to-t from-gray-500 to-gray-400 transition-all duration-300"
                              style={{ height: `${(otherHeight / heightPercent) * 100}%` }}
                            />
                          )}
                        </div>
                      </div>
                    ) : (
                      // Single bar for volume
                      <div
                        className={`w-full bg-gradient-to-t from-primary via-primary/80 to-primary/40 rounded-t transition-all duration-500 ease-out ${
                          isHovered ? "scale-x-110 shadow-lg shadow-primary/20" : ""
                        }`}
                        style={{
                          height: `${heightPercent}%`,
                          minHeight: slot.volume > 0 ? "4px" : "0",
                          transitionProperty: "height, transform, box-shadow",
                        }}
                      />
                    )}

                    {/* Glow effect on hover */}
                    {isHovered && (
                      <div
                        className="absolute inset-0 bg-primary/10 rounded-t animate-pulse pointer-events-none"
                        style={{ height: `${heightPercent}%`, bottom: 0, top: "auto" }}
                      />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  align="center"
                  sideOffset={10}
                  collisionPadding={16}
                  className="bg-card border-border p-4 shadow-xl max-w-[260px] whitespace-normal break-words"
                >
                  <div className="space-y-3">
                    <div className="font-semibold text-base text-foreground border-b border-border pb-2 mb-3">
                      <div>{slot.hour}</div>
                      {slot.dateLabel !== slot.hour && (
                        <div className="text-xs text-muted-foreground font-normal mt-1">{slot.dateLabel}</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"></span>
                          <span className="text-sm text-muted-foreground">Bid Orders:</span>
                        </div>
                        <span className="font-semibold text-foreground">{slot.bidOrders.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-gradient-to-r from-rose-500 to-rose-400"></span>
                          <span className="text-sm text-muted-foreground">Ask Orders:</span>
                        </div>
                        <span className="font-semibold text-foreground">{slot.askOrders.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-gradient-to-r from-violet-500 to-violet-400"></span>
                          <span className="text-sm text-muted-foreground">Transfers:</span>
                        </div>
                        <span className="font-semibold text-foreground">{slot.transfers.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-gradient-to-r from-amber-500 to-amber-400"></span>
                          <span className="text-sm text-muted-foreground">Issue Assets:</span>
                        </div>
                        <span className="font-semibold text-foreground">{slot.issues.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-gradient-to-r from-slate-500 to-slate-400"></span>
                          <span className="text-sm text-muted-foreground">Cancellations:</span>
                        </div>
                        <span className="font-semibold text-foreground">{slot.cancels.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400"></span>
                          <span className="text-sm text-muted-foreground">Mgmt Transfers:</span>
                        </div>
                        <span className="font-semibold text-foreground">{slot.mgmtTransfers.toLocaleString()}</span>
                      </div>
                      {slot.other > 0 && (
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-gradient-to-r from-gray-500 to-gray-400"></span>
                            <span className="text-sm text-muted-foreground">Other:</span>
                          </div>
                          <span className="font-semibold text-foreground">{slot.other.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                    <div className="border-t border-border pt-3 mt-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-muted-foreground">Total Events:</span>
                        <span className="font-bold text-lg text-foreground">{slot.total.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-muted-foreground">Total Volume:</span>
                        <span className="font-bold text-lg text-primary">
                          {slot.volume >= 1000000000
                            ? `${(slot.volume / 1000000000).toFixed(3)}B`
                            : slot.volume >= 1000000
                            ? `${(slot.volume / 1000000).toFixed(2)}M`
                            : slot.volume >= 1000
                            ? `${(slot.volume / 1000).toFixed(1)}K`
                            : slot.volume.toLocaleString()}
                        </span>
                      </div>
                      {slot.total > 0 && (
                        <div className="pt-2 border-t border-border/50">
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div className="flex justify-between">
                              <span>Bids:</span>
                              <span className="font-medium">{((slot.bidOrders / slot.total) * 100).toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Asks:</span>
                              <span className="font-medium">{((slot.askOrders / slot.total) * 100).toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Transfers:</span>
                              <span className="font-medium">{((slot.transfers / slot.total) * 100).toFixed(1)}%</span>
                            </div>
                            {slot.other > 0 && (
                              <div className="flex justify-between">
                                <span>Other:</span>
                                <span className="font-medium">{((slot.other / slot.total) * 100).toFixed(1)}%</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>

      {/* Time labels - Show key time slots */}
      <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
        {timeSlots.length > 0 && (
          <>
            <span>{timeSlots[0]?.hour || ""}</span>
            {timeSlots.length > 4 && <span>{timeSlots[Math.floor(timeSlots.length / 4)]?.hour || ""}</span>}
            {timeSlots.length > 2 && <span>{timeSlots[Math.floor(timeSlots.length / 2)]?.hour || ""}</span>}
            {timeSlots.length > 4 && <span>{timeSlots[Math.floor(timeSlots.length * 3 / 4)]?.hour || ""}</span>}
            <span>{timeSlots[timeSlots.length - 1]?.hour || ""}</span>
          </>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 justify-center pt-2 border-t border-border/50">
        {Object.entries(ACTION_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5 text-[10px]">
            <span
              className={`w-2.5 h-2.5 rounded-sm bg-gradient-to-r ${
                ACTION_COLORS[key as keyof typeof ACTION_COLORS]
              }`}
            ></span>
            <span className="text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* Quick Stats - Compact */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 pt-2 text-center text-[10px]">
        <div className="bg-background/20 rounded border border-border/40 px-2 py-1.5">
          <div className="text-base font-bold text-emerald-500">{totalBids.toLocaleString()}</div>
          <div className="text-[9px] text-muted-foreground">Bid Orders</div>
        </div>
        <div className="bg-background/20 rounded border border-border/40 px-2 py-1.5">
          <div className="text-base font-bold text-rose-500">{totalAsks.toLocaleString()}</div>
          <div className="text-[9px] text-muted-foreground">Ask Orders</div>
        </div>
        <div className="bg-background/20 rounded border border-border/40 px-2 py-1.5">
          <div className="text-base font-bold text-violet-500">{totalTransfers.toLocaleString()}</div>
          <div className="text-[9px] text-muted-foreground">Transfers</div>
        </div>
        <div className="bg-background/20 rounded border border-border/40 px-2 py-1.5">
          <div className="text-base font-bold text-amber-500">{totalIssues.toLocaleString()}</div>
          <div className="text-[9px] text-muted-foreground">Issues</div>
        </div>
        <div className="bg-background/20 rounded border border-border/40 px-2 py-1.5">
          <div className="text-base font-bold text-slate-400">{totalCancels.toLocaleString()}</div>
          <div className="text-[9px] text-muted-foreground">Cancels</div>
        </div>
        <div className="bg-background/20 rounded border border-border/40 px-2 py-1.5">
          <div className="text-base font-bold text-cyan-400">{totalMgmtTransfers.toLocaleString()}</div>
          <div className="text-[9px] text-muted-foreground">Mgmt Transfers</div>
        </div>
        {totalOther > 0 && (
          <div className="bg-background/20 rounded border border-border/40 px-2 py-1.5">
            <div className="text-base font-bold text-gray-400">{totalOther.toLocaleString()}</div>
            <div className="text-[9px] text-muted-foreground">Other</div>
          </div>
        )}
        <div className={`bg-background/25 rounded border-2 border-primary/30 px-2 py-1.5 ${totalOther > 0 ? 'sm:col-span-2 lg:col-span-1' : 'sm:col-span-3 lg:col-span-1'}`}>
          <div className="text-base font-bold text-primary">{totalActivity.toLocaleString()}</div>
          <div className="text-[9px] text-muted-foreground font-semibold">Total Events</div>
        </div>
      </div>
      
      {/* Volume Summary */}
      <div className="mt-3 pt-3 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Total Volume {timeRange === "all" ? "(All Time)" : `(${timeRange.toUpperCase()})`}:
          </span>
          <span className="text-lg font-bold text-primary">
            {timeSlots.reduce((acc, s) => acc + s.volume, 0) >= 1000000000
              ? `${(timeSlots.reduce((acc, s) => acc + s.volume, 0) / 1000000000).toFixed(3)}B`
              : timeSlots.reduce((acc, s) => acc + s.volume, 0) >= 1000000
              ? `${(timeSlots.reduce((acc, s) => acc + s.volume, 0) / 1000000).toFixed(2)}M`
              : timeSlots.reduce((acc, s) => acc + s.volume, 0) >= 1000
              ? `${(timeSlots.reduce((acc, s) => acc + s.volume, 0) / 1000).toFixed(1)}K`
              : timeSlots.reduce((acc, s) => acc + s.volume, 0).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
