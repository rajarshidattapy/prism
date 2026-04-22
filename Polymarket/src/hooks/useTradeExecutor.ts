import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useSyncTraderPositions = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (traderId: string) => {
      const { data, error } = await supabase.functions.invoke('trade-executor', {
        body: { 
          action: 'sync_trader_positions', 
          params: { traderId } 
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['trader-positions'] });
      toast({
        title: 'Positions Synced',
        description: `Found ${data.livePositions} live positions, ${data.newPositions.length} new.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Sync Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useGetTraderLivePositions = (address: string | undefined) => {
  return useQuery({
    queryKey: ['trader-live-positions', address],
    queryFn: async () => {
      if (!address) return [];

      const { data, error } = await supabase.functions.invoke('trade-executor', {
        body: { 
          action: 'get_trader_live_positions', 
          params: { address } 
        },
      });

      if (error) throw error;
      return data;
    },
    enabled: !!address,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useCheckAndReplicateTrades = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('trade-executor', {
        body: { action: 'check_and_replicate', params: {} },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-positions'] });
      queryClient.invalidateQueries({ queryKey: ['user-trades'] });
      
      const totalTrades = data.results.reduce(
        (sum: number, r: any) => sum + (r.tradesExecuted || 0), 
        0
      );
      
      if (totalTrades > 0) {
        toast({
          title: 'Trades Replicated',
          description: `Executed ${totalTrades} copy trades from ${data.tradersChecked} traders.`,
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Replication Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useTraderPositions = (traderId: string | undefined) => {
  return useQuery({
    queryKey: ['trader-positions', traderId],
    queryFn: async () => {
      if (!traderId) return [];

      // First get trader address
      const { data: trader, error: traderError } = await supabase
        .from('traders')
        .select('address')
        .eq('id', traderId)
        .maybeSingle();

      if (traderError || !trader) return [];

      // Get live positions
      const { data, error } = await supabase.functions.invoke('polymarket-api', {
        body: { 
          action: 'get_trader_positions', 
          params: { address: trader.address } 
        },
      });

      if (error) throw error;
      return data;
    },
    enabled: !!traderId,
    refetchInterval: 60000, // Refetch every minute
  });
};
