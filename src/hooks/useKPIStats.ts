import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWhaleDetection } from '@/hooks/useWhaleDetection';

interface KPIStats {
  totalEvents: number;
  activeWallets: number;
  whalesDetected: number;
  totalVolume: number;
  totalEvents24h: number;
  activeWallets24h: number;
  whalesDetected24h: number;
  totalVolume24h: number;
}

export function useKPIStats() {
  const { isWhale } = useWhaleDetection();

  return useQuery({
    queryKey: ['kpi-stats'],
    queryFn: async (): Promise<KPIStats> => {
      const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;

      // First, get the total count of events so we can batch through all of them
      const { count, error: countError } = await supabase
        .from('qx_events')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('Error fetching KPI stats count:', countError);
        throw countError;
      }

      const total = count || 0;
      if (total === 0) {
        return {
          totalEvents: 0,
          activeWallets: 0,
          whalesDetected: 0,
          totalVolume: 0,
          totalEvents24h: 0,
          activeWallets24h: 0,
          whalesDetected24h: 0,
          totalVolume24h: 0,
        };
      }

      // Fetch ALL events in batches, respecting Supabase row limits
      const batchSize = 1000;
      const totalBatches = Math.ceil(total / batchSize);

      const promises = Array.from({ length: totalBatches }, (_, batchIndex) => {
        const from = batchIndex * batchSize;
        const to = from + batchSize - 1;

        // Only select the columns we actually need for KPI calculations
        return supabase
          .from('qx_events')
          .select('source_id, asset_name, amount, timestamp')
          .order('created_at', { ascending: false })
          .range(from, to);
      });

      const results = await Promise.all(promises);

      const events: any[] = [];
      for (const { data, error } of results) {
        if (error) {
          console.error('Error fetching KPI stats batch:', error);
          throw error;
        }
        if (data && data.length > 0) {
          events.push(...data);
        }
      }

      // Split into all-time and 24h windows using the timestamp column
      const events24hData = events.filter((event) => {
        if (event.timestamp == null) return false;
        const ts =
          typeof event.timestamp === 'number'
            ? (event.timestamp < 1e12 ? event.timestamp * 1000 : event.timestamp)
            : Number(event.timestamp);
        if (!Number.isFinite(ts)) return false;
        return ts >= twentyFourHoursAgo;
      });

      // Calculate overall stats
      const uniqueWallets = new Set<string>();
      let whaleCount = 0;
      let totalVolume = 0;

      events.forEach((event) => {
        uniqueWallets.add(event.source_id);
        
        const rawAmount =
          typeof event.amount === 'string'
            ? Number(event.amount.replace(/,/g, ''))
            : Number(event.amount ?? 0);
        const amount = Number.isFinite(rawAmount) ? rawAmount : 0;
        const token = event.asset_name || 'QUBIC';
        totalVolume += amount;

        if (isWhale(token, amount)) {
          whaleCount++;
        }
      });

      // Calculate 24h stats
      const uniqueWallets24h = new Set<string>();
      let whaleCount24h = 0;
      let totalVolume24h = 0;

      events24hData.forEach((event) => {
        uniqueWallets24h.add(event.source_id);
        
        const rawAmount =
          typeof event.amount === 'string'
            ? Number(event.amount.replace(/,/g, ''))
            : Number(event.amount ?? 0);
        const amount = Number.isFinite(rawAmount) ? rawAmount : 0;
        const token = event.asset_name || 'QUBIC';
        totalVolume24h += amount;

        if (isWhale(token, amount)) {
          whaleCount24h++;
        }
      });

      return {
        totalEvents: events.length,
        activeWallets: uniqueWallets.size,
        whalesDetected: whaleCount,
        totalVolume: totalVolume,
        totalEvents24h: events24hData.length,
        activeWallets24h: uniqueWallets24h.size,
        whalesDetected24h: whaleCount24h,
        totalVolume24h: totalVolume24h,
      };
    },
    refetchInterval: 60000, // Refetch every minute
  });
}