import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWallet } from '@/contexts/WalletContext';
import { useToast } from '@/hooks/use-toast';

interface Market {
  id: string;
  title: string;
  description?: string;
  outcomes: string[];
  volume: number;
  liquidity: number;
  endDate: string;
  active: boolean;
  tokens?: { token_id: string; outcome: string; price: number }[];
}

interface OrderParams {
  tokenId: string;
  side: 'BUY' | 'SELL';
  price: number;
  size: number;
  marketTitle: string;
  outcome: string;
}

interface OrderResult {
  orderId: string;
  status: string;
  filledSize?: number;
  avgPrice?: number;
}

// Fetch available markets
export const useMarkets = (limit = 20) => {
  return useQuery({
    queryKey: ['polymarket-markets', limit],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('polymarket-api', {
        body: { action: 'get_markets', params: { limit, active: true } },
      });

      if (error) throw error;
      return data as Market[];
    },
    staleTime: 60000, // 1 minute
    refetchInterval: 120000, // 2 minutes
  });
};

// Fetch single market details
export const useMarket = (marketId: string | undefined) => {
  return useQuery({
    queryKey: ['polymarket-market', marketId],
    queryFn: async () => {
      if (!marketId) return null;
      
      const { data, error } = await supabase.functions.invoke('polymarket-api', {
        body: { action: 'get_market', params: { marketId } },
      });

      if (error) throw error;
      return data as Market;
    },
    enabled: !!marketId,
  });
};

// Fetch order book for a token
export const useOrderBook = (tokenId: string | undefined) => {
  return useQuery({
    queryKey: ['polymarket-orderbook', tokenId],
    queryFn: async () => {
      if (!tokenId) return { bids: [], asks: [] };
      
      const { data, error } = await supabase.functions.invoke('polymarket-api', {
        body: { action: 'get_order_book', params: { tokenId } },
      });

      if (error) throw error;
      return data;
    },
    enabled: !!tokenId,
    refetchInterval: 5000, // Refresh every 5 seconds
  });
};

// Fetch current price
export const useTokenPrice = (tokenId: string | undefined) => {
  return useQuery({
    queryKey: ['polymarket-price', tokenId],
    queryFn: async () => {
      if (!tokenId) return null;
      
      const { data, error } = await supabase.functions.invoke('polymarket-api', {
        body: { action: 'get_price', params: { tokenId } },
      });

      if (error) throw error;
      return data?.price || null;
    },
    enabled: !!tokenId,
    refetchInterval: 10000, // Refresh every 10 seconds
  });
};

// Execute a trade
export const usePlaceOrder = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { address, signMessage } = useWallet();

  return useMutation({
    mutationFn: async (params: OrderParams): Promise<OrderResult> => {
      if (!address) {
        throw new Error('Wallet not connected');
      }

      // Create order message for signing
      const orderMessage = JSON.stringify({
        tokenId: params.tokenId,
        side: params.side,
        price: params.price,
        size: params.size,
        timestamp: Date.now(),
        maker: address,
      });

      // Sign the order with wallet
      const signature = await signMessage(orderMessage);
      
      if (!signature) {
        throw new Error('Failed to sign order');
      }

      // Submit order to backend
      const { data, error } = await supabase.functions.invoke('polymarket-api', {
        body: {
          action: 'place_order',
          params: {
            tokenId: params.tokenId,
            side: params.side,
            price: params.price,
            size: params.size,
            signature,
            maker: address,
          },
        },
      });

      if (error) throw error;
      
      // Record the trade in database
      await supabase.from('trades').insert({
        user_id: address, // Will be replaced with actual auth user ID
        market_id: params.tokenId,
        market_title: params.marketTitle,
        outcome: params.outcome,
        trade_type: params.side.toLowerCase(),
        size: params.size,
        price: params.price,
        status: 'executed',
      });

      return data as OrderResult;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-positions'] });
      queryClient.invalidateQueries({ queryKey: ['user-trades'] });
      
      toast({
        title: 'Order Placed',
        description: `${variables.side} ${variables.size} shares of "${variables.outcome}" at $${variables.price.toFixed(2)}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Order Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

// Quick buy/sell at market price
export const useMarketOrder = () => {
  const placeOrder = usePlaceOrder();

  const buyAtMarket = useCallback(
    async (tokenId: string, size: number, marketPrice: number, marketTitle: string, outcome: string) => {
      return placeOrder.mutateAsync({
        tokenId,
        side: 'BUY',
        price: marketPrice,
        size,
        marketTitle,
        outcome,
      });
    },
    [placeOrder]
  );

  const sellAtMarket = useCallback(
    async (tokenId: string, size: number, marketPrice: number, marketTitle: string, outcome: string) => {
      return placeOrder.mutateAsync({
        tokenId,
        side: 'SELL',
        price: marketPrice,
        size,
        marketTitle,
        outcome,
      });
    },
    [placeOrder]
  );

  return {
    buyAtMarket,
    sellAtMarket,
    isLoading: placeOrder.isPending,
    error: placeOrder.error,
  };
};

// Copy a specific trade from a trader
export const useCopyTrade = () => {
  const { toast } = useToast();
  const placeOrder = usePlaceOrder();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      position,
      riskMultiplier = 1,
      maxSize = 100,
    }: {
      position: {
        market_id: string;
        market_title: string;
        outcome: string;
        entry_price: number;
        size: number;
      };
      riskMultiplier?: number;
      maxSize?: number;
    }) => {
      const adjustedSize = Math.min(position.size * riskMultiplier, maxSize);
      
      return placeOrder.mutateAsync({
        tokenId: position.market_id,
        side: 'BUY',
        price: position.entry_price,
        size: adjustedSize,
        marketTitle: position.market_title,
        outcome: position.outcome,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-positions'] });
      toast({
        title: 'Trade Copied',
        description: 'Successfully copied the trader\'s position.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Copy Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
