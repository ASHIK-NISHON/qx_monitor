import { useMemo } from "react";
import { useAllQxEvents } from "@/hooks/useQxEvents";

// Base known tokens that are always shown
const BASE_TOKENS = ["QUBIC", "QMINE", "GARTH", "MATILDA", "CFB", "QXMR"];

export function useUniqueTokens() {
  // Fetch all events (batched under the hood) so token discovery
  // is not limited to an arbitrary slice of recent rows.
  const { data: events = [] } = useAllQxEvents();

  const uniqueTokens = useMemo(() => {
    const tokenSet = new Set<string>(BASE_TOKENS);
    
    events.forEach((event) => {
      if (event.token && event.token.trim()) {
        tokenSet.add(event.token.toUpperCase());
      }
    });

    // Sort alphabetically but keep BASE_TOKENS at the top
    const sorted = Array.from(tokenSet).sort((a, b) => {
      const aIndex = BASE_TOKENS.indexOf(a);
      const bIndex = BASE_TOKENS.indexOf(b);
      
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    });

    return sorted;
  }, [events]);

  return uniqueTokens;
}
