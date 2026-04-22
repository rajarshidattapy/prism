import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PolymarketTrader {
  id: string;
  address: string;
  username: string;
  avatar: string;
  roi: {
    daily: string;
    weekly: string;
    monthly: string;
    allTime: string;
  };
  winRate: string;
  totalVolume: number;
  activePositions: number;
  riskScore: 'low' | 'medium' | 'high';
  followers: number;
  isVerified: boolean;
  trades: number;
}

export interface PolymarketMarket {
  id: string;
  title: string;
  description: string;
  outcomes: string[];
  volume: number;
  liquidity: number;
  endDate: string;
  image?: string;
  active: boolean;
}

export const usePolymarketLeaderboard = (limit = 20) => {
  return useQuery({
    queryKey: ['polymarket-leaderboard', limit],
    queryFn: async (): Promise<PolymarketTrader[]> => {
      const { data, error } = await supabase.functions.invoke('polymarket-api', {
        body: { action: 'get_leaderboard', params: { limit } }
      });

      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const usePolymarketMarkets = (limit = 20) => {
  return useQuery({
    queryKey: ['polymarket-markets', limit],
    queryFn: async (): Promise<PolymarketMarket[]> => {
      const { data, error } = await supabase.functions.invoke('polymarket-api', {
        body: { action: 'get_markets', params: { limit } }
      });

      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

export const useTraderPositions = (address: string | null) => {
  return useQuery({
    queryKey: ['trader-positions', address],
    queryFn: async () => {
      if (!address) return [];
      
      const { data, error } = await supabase.functions.invoke('polymarket-api', {
        body: { action: 'get_trader_positions', params: { address } }
      });

      if (error) throw error;
      return data;
    },
    enabled: !!address,
    staleTime: 1000 * 60 * 1, // 1 minute
  });
};
