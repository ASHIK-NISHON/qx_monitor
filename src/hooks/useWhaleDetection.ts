import { useMemo, useCallback } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { QubicEvent } from "@/data/events";

// Parse amount string to number (removes commas and token suffix)
export function parseAmount(amountStr: string): number {
  const numStr = amountStr.replace(/,/g, "").split(" ")[0];
  return parseFloat(numStr) || 0;
}

export function useWhaleDetection() {
  const { isWhale, getThresholdForToken, whaleThresholds } = useSettings();

  const detectWhaleInEvent = useCallback((event: QubicEvent): boolean => {
    const amount = parseAmount(event.amount);
    return isWhale(event.token, amount);
  }, [isWhale]);

  const getEventsWithWhaleStatus = useCallback((events: QubicEvent[]): (QubicEvent & { isWhaleEvent: boolean })[] => {
    return events.map((event) => ({
      ...event,
      isWhaleEvent: detectWhaleInEvent(event),
    }));
  }, [detectWhaleInEvent]);

  const getWhaleWallets = useCallback((events: QubicEvent[]): Set<string> => {
    const whaleWallets = new Set<string>();
    events.forEach((event) => {
      if (detectWhaleInEvent(event)) {
        whaleWallets.add(event.from);
        whaleWallets.add(event.to);
      }
    });
    return whaleWallets;
  }, [detectWhaleInEvent]);

  return {
    detectWhaleInEvent,
    getEventsWithWhaleStatus,
    getWhaleWallets,
    isWhale,
    getThresholdForToken,
    whaleThresholds,
  };
}
