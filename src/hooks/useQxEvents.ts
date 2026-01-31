import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { QxEventDB, DisplayEvent, transformEvent } from '@/types/qxEvent';

// Get total count of all events
export function useTotalEventsCount() {
  return useQuery({
    queryKey: ['qx-events-count'],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('qx_events')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('Error fetching events count:', error);
        return 0;
      }

      return count || 0;
    },
    refetchInterval: 60000,
  });
}

// Get count for filtered results
export function useFilteredEventsCount(
  searchQuery: string = '',
  tokenFilter: string = 'all-tokens',
  typeFilter: string = 'all-types'
) {
  return useQuery({
    queryKey: ['filtered-events-count', searchQuery, tokenFilter, typeFilter],
    queryFn: async (): Promise<number> => {
      if (!searchQuery.trim() && tokenFilter === 'all-tokens' && typeFilter === 'all-types') {
        return 0;
      }

      let query = supabase
        .from('qx_events')
        .select('*', { count: 'exact', head: true });

      // Apply search filter - search across multiple fields
      if (searchQuery.trim()) {
        const q = searchQuery.trim();
        // Try to parse as number for tick_number search
        const asNumber = parseInt(q);
        
        if (!isNaN(asNumber)) {
          // Search in tick_number, source_id, dest_id
          query = query.or(
            `tick_number.eq.${asNumber},source_id.ilike.%${q}%,dest_id.ilike.%${q}%`
          );
        } else {
          // Search in source_id, dest_id only (for addresses)
          query = query.or(
            `source_id.ilike.%${q}%,dest_id.ilike.%${q}%`
          );
        }
      }

      // Apply token filter - handle case-insensitive matching
      if (tokenFilter !== 'all-tokens') {
        const upperToken = tokenFilter.toUpperCase();
        // Check both asset_name (exact match) and NULL (for QUBIC)
        if (upperToken === 'QUBIC') {
          query = query.or(`asset_name.is.null,asset_name.ilike.QUBIC`);
        } else {
          query = query.ilike('asset_name', upperToken);
        }
      }

      // Apply type filter
      if (typeFilter !== 'all-types' && typeFilter !== 'whale') {
        const typeMap: Record<string, string> = {
          bid: 'AddToBidOrder',
          ask: 'AddToAskOrder',
          transfer: 'TransferShareOwnershipAndPossession',
          issue: 'IssueAsset',
          cancelAsk: 'RemoveFromAskOrder',
          cancelBid: 'RemoveFromBidOrder',
        };
        query = query.eq('procedure_type_name', typeMap[typeFilter] || typeFilter);
      }

      const { count, error } = await query;

      if (error) {
        console.error('Error fetching filtered count:', error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!(searchQuery.trim() || tokenFilter !== 'all-tokens' || typeFilter !== 'all-types'),
  });
}

export function useQxEvents(pageIndex: number = 0, pageSize: number = 50) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['qx-events', pageIndex, pageSize],
    queryFn: async (): Promise<DisplayEvent[]> => {
      const from = pageIndex * pageSize;
      const to = from + pageSize - 1;

      const { data, error } = await supabase
        .from('qx_events')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error fetching events:', error);
        throw error;
      }

      return (data as QxEventDB[]).map(transformEvent);
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    const channel = supabase
      .channel('qx-events-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'qx_events',
        },
        (payload) => {
          console.log('New event received:', payload);
          queryClient.invalidateQueries({ queryKey: ['qx-events'] });
          queryClient.invalidateQueries({ queryKey: ['qx-events-count'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

// Search with pagination
export function useSearchQxEvents(
  searchQuery: string = '',
  tokenFilter: string = 'all-tokens',
  typeFilter: string = 'all-types',
  pageIndex: number = 0,
  pageSize: number = 50
) {
  return useQuery({
    queryKey: ['search-qx-events', searchQuery, tokenFilter, typeFilter, pageIndex, pageSize],
    queryFn: async (): Promise<DisplayEvent[]> => {
      const from = pageIndex * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('qx_events')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply search filter - search in tick_number, addresses
      if (searchQuery.trim()) {
        const q = searchQuery.trim();
        // Try to parse as number for tick_number search
        const asNumber = parseInt(q);
        
        if (!isNaN(asNumber)) {
          // Search in tick_number, source_id, dest_id
          query = query.or(
            `tick_number.eq.${asNumber},source_id.ilike.%${q}%,dest_id.ilike.%${q}%`
          );
        } else {
          // Search in source_id, dest_id only (for addresses)
          query = query.or(
            `source_id.ilike.%${q}%,dest_id.ilike.%${q}%`
          );
        }
      }

      // Apply token filter - handle case-insensitive matching
      if (tokenFilter !== 'all-tokens') {
        const upperToken = tokenFilter.toUpperCase();
        // Check both asset_name (exact match) and NULL (for QUBIC)
        if (upperToken === 'QUBIC') {
          query = query.or(`asset_name.is.null,asset_name.ilike.QUBIC`);
        } else {
          query = query.ilike('asset_name', upperToken);
        }
      }

      // Apply type filter
      if (typeFilter !== 'all-types' && typeFilter !== 'whale') {
        const typeMap: Record<string, string> = {
          bid: 'AddToBidOrder',
          ask: 'AddToAskOrder',
          transfer: 'TransferShareOwnershipAndPossession',
          issue: 'IssueAsset',
          cancelAsk: 'RemoveFromAskOrder',
          cancelBid: 'RemoveFromBidOrder',
        };
        query = query.eq('procedure_type_name', typeMap[typeFilter] || typeFilter);
      }

      // Apply pagination
      query = query.range(from, to);

      const { data, error } = await query;

      if (error) {
        console.error('Error searching events:', error);
        throw error;
      }

      return (data as QxEventDB[]).map(transformEvent);
    },
    enabled: !!(searchQuery.trim() || tokenFilter !== 'all-tokens' || typeFilter !== 'all-types'),
  });
}

// Fetch all events in batches (for client-side filtering like whale detection)
export function useAllQxEvents() {
  const { data: totalCount = 0 } = useTotalEventsCount();

  return useQuery({
    queryKey: ['all-qx-events', totalCount],
    queryFn: async (): Promise<DisplayEvent[]> => {
      // First get the count if we don't have it
      let count = totalCount;
      if (count === 0) {
        const { count: fetchedCount, error: countError } = await supabase
          .from('qx_events')
          .select('*', { count: 'exact', head: true });
        
        if (countError) {
          console.error('Error fetching events count:', countError);
          throw countError;
        }
        count = fetchedCount || 0;
      }

      if (count === 0) return [];

      // Fetch ALL events in batches, respecting Supabase row limits
      const batchSize = 1000;
      const totalBatches = Math.ceil(count / batchSize);

      const promises = Array.from({ length: totalBatches }, (_, batchIndex) => {
        const from = batchIndex * batchSize;
        const to = from + batchSize - 1;

        return supabase
          .from('qx_events')
          .select('*')
          .order('created_at', { ascending: false })
          .range(from, to);
      });

      const results = await Promise.all(promises);

      const events: QxEventDB[] = [];
      for (const { data, error } of results) {
        if (error) {
          console.error('Error fetching events batch:', error);
          throw error;
        }
        if (data && data.length > 0) {
          events.push(...data);
        }
      }

      return events.map(transformEvent);
    },
    enabled: true,
    refetchInterval: 30000,
  });
}

export function useEventsByWallet(walletAddress: string | null) {
  return useQuery({
    queryKey: ['wallet-events', walletAddress],
    queryFn: async (): Promise<DisplayEvent[]> => {
      if (!walletAddress) return [];

      const { data, error } = await supabase
        .from('qx_events')
        .select('*')
        .or(`source_id.eq.${walletAddress},dest_id.eq.${walletAddress}`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching wallet events:', error);
        throw error;
      }

      return (data as QxEventDB[]).map(transformEvent);
    },
    enabled: !!walletAddress,
  });
}