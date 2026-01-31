import { useQuery } from '@tanstack/react-query';
import { walletAnalyzer, WalletAnalysisResult } from '@/lib/qubicWalletAnalyzer';

export function useAdvancedWalletDetails(address: string | null, enabled: boolean = false) {
  return useQuery({
    queryKey: ['advanced-wallet-details', address],
    queryFn: async (): Promise<WalletAnalysisResult | null> => {
      if (!address) return null;
      try {
        const result = await walletAnalyzer.analyzeWallet(address);
        // If the result is invalid, throw an error so React Query can catch it
        if (!result.valid && result.error) {
          throw new Error(result.error);
        }
        return result;
      } catch (error) {
        console.error('Error in useAdvancedWalletDetails:', error);
        throw error;
      }
    },
    enabled: !!address && enabled,
    staleTime: 60000, // Data is fresh for 1 minute
    gcTime: 300000, // Keep in cache for 5 minutes
    retry: 1, // Only retry once on failure
  });
}
