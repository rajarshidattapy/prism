import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWallet } from '@/contexts/WalletContext';
import { useToast } from '@/hooks/use-toast';

export const useClosePosition = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (positionId: string) => {
      const { data, error } = await supabase
        .from('positions')
        .update({ 
          status: 'closed',
          closed_at: new Date().toISOString()
        })
        .eq('id', positionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-positions'] });
      queryClient.invalidateQueries({ queryKey: ['user-trades'] });
      toast({
        title: 'Position Closed',
        description: 'Your position has been closed successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useCopySubscriptions = () => {
  const { user } = useWallet();

  return useQuery({
    queryKey: ['copy-subscriptions', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('copy_subscriptions')
        .select(`
          *,
          traders (
            id,
            username,
            avatar_url,
            address
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useCreateSubscription = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useWallet();

  return useMutation({
    mutationFn: async (params: {
      traderId: string;
      allocation: number;
      maxTradeSize: number;
      riskMultiplier: number;
      maxOpenPositions: number;
      stopLoss: number;
    }) => {
      if (!user) throw new Error('Not authenticated. Please reconnect your wallet.');

      const { data, error } = await supabase
        .from('copy_subscriptions')
        .insert({
          user_id: user.id,
          trader_id: params.traderId,
          allocation: params.allocation,
          max_trade_size: params.maxTradeSize,
          risk_multiplier: params.riskMultiplier,
          max_open_positions: params.maxOpenPositions,
          stop_loss: params.stopLoss,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['copy-subscriptions'] });
      toast({
        title: 'Copy Trading Started',
        description: 'You are now copying this trader.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateSubscription = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      status?: 'active' | 'paused' | 'stopped';
      allocation?: number;
      maxTradeSize?: number;
      riskMultiplier?: number;
      maxOpenPositions?: number;
      stopLoss?: number;
    }) => {
      const { id, ...updates } = params;

      const updateData: Record<string, any> = {};
      if (updates.status) updateData.status = updates.status;
      if (updates.allocation) updateData.allocation = updates.allocation;
      if (updates.maxTradeSize) updateData.max_trade_size = updates.maxTradeSize;
      if (updates.riskMultiplier) updateData.risk_multiplier = updates.riskMultiplier;
      if (updates.maxOpenPositions) updateData.max_open_positions = updates.maxOpenPositions;
      if (updates.stopLoss) updateData.stop_loss = updates.stopLoss;

      const { data, error } = await supabase
        .from('copy_subscriptions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['copy-subscriptions'] });
      
      if (variables.status === 'paused') {
        toast({ title: 'Copy Trading Paused' });
      } else if (variables.status === 'active') {
        toast({ title: 'Copy Trading Resumed' });
      } else if (variables.status === 'stopped') {
        toast({ title: 'Copy Trading Stopped', variant: 'destructive' });
      } else {
        toast({ title: 'Settings Updated' });
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useUserPositions = () => {
  const { user } = useWallet();

  return useQuery({
    queryKey: ['user-positions', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'open');

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useUserTrades = (limit = 20) => {
  const { user } = useWallet();

  return useQuery({
    queryKey: ['user-trades', user?.id, limit],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('executed_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};
