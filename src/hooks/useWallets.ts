import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface WalletWithStats {
  address: string;
  firstSeenAt: string;
  lastSeenAt: string;
  transactionCount: number;
  latestTickNo: number;
}

export function useWallets() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['wallets'],
    queryFn: async (): Promise<WalletWithStats[]> => {
      // Get total count first (Supabase default limit is 1000; we fetch all in batches)
      const { count: totalCount, error: countError } = await supabase
        .from('wallets')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('Error fetching wallets count:', countError);
        throw countError;
      }

      const count = totalCount ?? 0;
      if (count === 0) return [];

      // Fetch ALL wallets in batches of 1000 to avoid Supabase row limit
      const batchSize = 1000;
      const totalBatches = Math.ceil(count / batchSize);

      const batchPromises = Array.from({ length: totalBatches }, (_, batchIndex) => {
        const from = batchIndex * batchSize;
        const to = from + batchSize - 1;
        return supabase
          .from('wallets')
          .select('address, first_seen_at, last_seen_at, transaction_count, latest_tick_number')
          .order('latest_tick_number', { ascending: false })
          .range(from, to);
      });

      const results = await Promise.all(batchPromises);

      const wallets: Array<{
        address: string;
        first_seen_at: string | null;
        last_seen_at: string | null;
        transaction_count: number | null;
        latest_tick_number: number | null;
      }> = [];

      for (const { data, error } of results) {
        if (error) {
          console.error('Error fetching wallets batch:', error);
          throw error;
        }
        if (data?.length) wallets.push(...data);
      }

      // Transform to WalletWithStats
      return wallets.map((wallet) => ({
        address: wallet.address,
        firstSeenAt: wallet.first_seen_at || new Date().toISOString(),
        lastSeenAt: wallet.last_seen_at || new Date().toISOString(),
        transactionCount: wallet.transaction_count || 0,
        latestTickNo: wallet.latest_tick_number || 0,
      }));
    },
    refetchInterval: 60000, // Refetch every minute
  });

  // Set up real-time subscription for wallet changes
  useEffect(() => {
    const channel = supabase
      .channel('wallets-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'wallets',
        },
        () => {
          // Invalidate wallets query when wallets table changes
          // This now includes tick number updates since it's stored in the wallet record
          queryClient.invalidateQueries({ queryKey: ['wallets'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

// Fetch wallet details from Qubic RPC API
export interface QubicWalletDetails {
  balance: string;
  validForTick: number;
  latestIncomingTransferTick: number;
  latestOutgoingTransferTick: number;
  incomingAmount: string;
  outgoingAmount: string;
  numberOfIncomingTransfers: number;
  numberOfOutgoingTransfers: number;
}

export function useWalletDetails(address: string | null) {
  return useQuery({
    queryKey: ['wallet-details', address],
    queryFn: async (): Promise<QubicWalletDetails | null> => {
      if (!address) return null;

      try {
        // Using Qubic RPC API to fetch wallet balance
        const response = await fetch('https://rpc.qubic.org/v1/balances/' + address);
        
        if (!response.ok) {
          console.error('Failed to fetch wallet details:', response.statusText);
          return null;
        }

        const data = await response.json();
        
        if (data.balance) {
          return {
            balance: data.balance.balance || '0',
            validForTick: data.balance.validForTick || 0,
            latestIncomingTransferTick: data.balance.latestIncomingTransferTick || 0,
            latestOutgoingTransferTick: data.balance.latestOutgoingTransferTick || 0,
            incomingAmount: data.balance.incomingAmount || '0',
            outgoingAmount: data.balance.outgoingAmount || '0',
            numberOfIncomingTransfers: data.balance.numberOfIncomingTransfers || 0,
            numberOfOutgoingTransfers: data.balance.numberOfOutgoingTransfers || 0,
          };
        }
        
        return null;
      } catch (error) {
        console.error('Error fetching wallet details:', error);
        return null;
      }
    },
    enabled: !!address,
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
}