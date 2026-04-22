import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Polymarket API endpoints
const POLYMARKET_CLOB_API = 'https://clob.polymarket.com';
const GAMMA_API = 'https://gamma-api.polymarket.com';

interface TraderData {
  address: string;
  username: string;
  volume: number;
  pnl: number;
  winRate: number;
  positions: number;
}

// Create HMAC signature for Polymarket API authentication
async function createSignature(secret: string, timestamp: string, method: string, path: string, body = '') {
  const message = timestamp + method + path + body;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

// Make authenticated request to Polymarket CLOB API
async function authenticatedRequest(method: string, path: string, body?: any) {
  const apiKey = Deno.env.get('POLYMARKET_API_KEY');
  const apiSecret = Deno.env.get('POLYMARKET_API_SECRET');
  const passphrase = Deno.env.get('POLYMARKET_PASSPHRASE');

  if (!apiKey || !apiSecret || !passphrase) {
    console.log('Polymarket API credentials not configured');
    return null;
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const bodyStr = body ? JSON.stringify(body) : '';
  const signature = await createSignature(apiSecret, timestamp, method, path, bodyStr);

  const headers: Record<string, string> = {
    'POLY_API_KEY': apiKey,
    'POLY_SIGNATURE': signature,
    'POLY_TIMESTAMP': timestamp,
    'POLY_PASSPHRASE': passphrase,
    'Content-Type': 'application/json',
  };

  const response = await fetch(`${POLYMARKET_CLOB_API}${path}`, {
    method,
    headers,
    body: body ? bodyStr : undefined,
  });

  if (!response.ok) {
    console.log(`Polymarket API error: ${response.status} ${response.statusText}`);
    return null;
  }

  return response.json();
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, params } = await req.json();
    console.log(`Polymarket API action: ${action}`, params);

    let result;

    switch (action) {
      case 'get_markets':
        result = await getMarkets(params);
        break;
      case 'get_market':
        result = await getMarket(params.marketId);
        break;
      case 'get_trader_positions':
        result = await getTraderPositions(params.address);
        break;
      case 'get_leaderboard':
        result = await getLeaderboard(params);
        break;
      case 'get_order_book':
        result = await getOrderBook(params.tokenId);
        break;
      case 'get_price':
        result = await getPrice(params.tokenId);
        break;
      case 'place_order':
        result = await placeOrder(params);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Polymarket API error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

async function getMarkets(params: { limit?: number; active?: boolean }) {
  const limit = params?.limit || 20;
  
  try {
    // Fetch active markets from Gamma API (public, no auth required)
    const response = await fetch(`${GAMMA_API}/markets?limit=${limit}&active=true&closed=false`);
    
    if (!response.ok) {
      console.log('Gamma API response not ok, using fallback data');
      return getFallbackMarkets();
    }
    
    const data = await response.json();
    console.log(`Fetched ${data.length} markets from Polymarket`);
    
    return data.map((market: any) => {
      // Parse outcomes if it's a string (Polymarket API returns JSON string)
      let outcomes = ['Yes', 'No'];
      if (typeof market.outcomes === 'string') {
        try {
          outcomes = JSON.parse(market.outcomes);
        } catch {
          outcomes = ['Yes', 'No'];
        }
      } else if (Array.isArray(market.outcomes)) {
        outcomes = market.outcomes;
      }

      return {
        id: market.id || market.condition_id,
        title: market.question || market.title,
        description: market.description,
        outcomes,
        volume: parseFloat(market.volume || market.volumeNum || '0'),
        liquidity: parseFloat(market.liquidity || '0'),
        endDate: market.end_date_iso || market.endDate,
        image: market.image,
        active: market.active !== false,
        tokens: market.tokens || [],
      };
    });
  } catch (error) {
    console.error('Error fetching markets:', error);
    return getFallbackMarkets();
  }
}

async function getMarket(marketId: string) {
  try {
    const response = await fetch(`${GAMMA_API}/markets/${marketId}`);
    
    if (!response.ok) {
      throw new Error('Market not found');
    }
    
    const market = await response.json();
    
    return {
      id: market.id || market.condition_id,
      title: market.question || market.title,
      description: market.description,
      outcomes: market.outcomes || ['Yes', 'No'],
      volume: parseFloat(market.volume || '0'),
      liquidity: parseFloat(market.liquidity || '0'),
      endDate: market.end_date_iso,
      image: market.image,
      active: market.active,
      tokens: market.tokens || [],
    };
  } catch (error) {
    console.error('Error fetching market:', error);
    throw error;
  }
}

async function getTraderPositions(address: string) {
  try {
    // Try authenticated API first
    const authPositions = await authenticatedRequest('GET', `/positions?user=${address}`);
    
    if (authPositions) {
      console.log(`Fetched ${authPositions.length} positions via authenticated API`);
      return authPositions.map((pos: any) => ({
        id: pos.id,
        market_id: pos.condition_id || pos.market_id,
        market_title: pos.market || pos.title,
        outcome: pos.outcome,
        size: parseFloat(pos.size || '0'),
        entry_price: parseFloat(pos.avg_price || pos.entry_price || '0'),
        current_price: parseFloat(pos.current_price || '0'),
        pnl: parseFloat(pos.pnl || '0'),
        pnl_percent: parseFloat(pos.pnl_percent || '0'),
      }));
    }

    // Fallback to public API attempt
    const response = await fetch(`${POLYMARKET_CLOB_API}/positions?user=${address}`);
    
    if (!response.ok) {
      console.log('CLOB API not available, using fallback');
      return getFallbackPositions(address);
    }
    
    const positions = await response.json();
    return positions;
  } catch (error) {
    console.error('Error fetching positions:', error);
    return getFallbackPositions(address);
  }
}

async function getOrderBook(tokenId: string) {
  try {
    const response = await fetch(`${POLYMARKET_CLOB_API}/book?token_id=${tokenId}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch order book');
    }
    
    return response.json();
  } catch (error) {
    console.error('Error fetching order book:', error);
    return { bids: [], asks: [] };
  }
}

async function getPrice(tokenId: string) {
  try {
    const response = await fetch(`${POLYMARKET_CLOB_API}/price?token_id=${tokenId}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch price');
    }
    
    return response.json();
  } catch (error) {
    console.error('Error fetching price:', error);
    return null;
  }
}

async function placeOrder(params: {
  tokenId: string;
  side: 'BUY' | 'SELL';
  price: number;
  size: number;
}) {
  const order = await authenticatedRequest('POST', '/orders', {
    token_id: params.tokenId,
    side: params.side,
    price: params.price.toString(),
    size: params.size.toString(),
    type: 'GTC', // Good Till Cancelled
  });

  if (!order) {
    throw new Error('Failed to place order - check API credentials');
  }

  return order;
}

async function getLeaderboard(params: { period?: string; limit?: number }) {
  const limit = params?.limit || 20;
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // First try to fetch from our traders table
  const { data: traders, error } = await supabase
    .from('traders')
    .select('*')
    .order('roi_monthly', { ascending: false })
    .limit(limit);

  if (error || !traders || traders.length === 0) {
    console.log('No traders in database, generating mock data');
    return generateLeaderboardData(limit);
  }

  console.log(`Fetched ${traders.length} traders from database`);
  
  return traders.map((trader: any) => ({
    id: trader.id,
    address: trader.address,
    username: trader.username || `Trader_${trader.address.slice(2, 8)}`,
    avatar: trader.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${trader.address}`,
    roi: {
      daily: trader.roi_daily?.toFixed(2) || '0',
      weekly: trader.roi_weekly?.toFixed(2) || '0',
      monthly: trader.roi_monthly?.toFixed(2) || '0',
      allTime: trader.roi_all_time?.toFixed(2) || '0',
    },
    winRate: trader.win_rate?.toFixed(1) || '0',
    totalVolume: trader.total_volume || 0,
    activePositions: trader.active_positions || 0,
    riskScore: trader.risk_score || 'medium',
    followers: trader.followers_count || 0,
    isVerified: trader.is_verified || false,
    trades: trader.total_trades || 0,
  }));
}

function getFallbackMarkets() {
  return [
    {
      id: 'btc-100k-2025',
      title: 'Will Bitcoin reach $100,000 by end of 2025?',
      description: 'This market resolves to Yes if Bitcoin reaches $100,000 USD on any major exchange.',
      outcomes: ['Yes', 'No'],
      volume: 4850000,
      liquidity: 1290000,
      endDate: '2025-12-31T23:59:59Z',
      active: true,
    },
    {
      id: 'fed-rate-jan',
      title: 'Will the Fed cut rates in January 2025?',
      description: 'Resolves to Yes if Federal Reserve cuts interest rates.',
      outcomes: ['Yes', 'No'],
      volume: 1290000,
      liquidity: 420000,
      endDate: '2025-01-31T23:59:59Z',
      active: true,
    },
    {
      id: 'eth-5k-q2',
      title: 'Will ETH be above $5,000 by Q2 2025?',
      description: 'Ethereum price prediction market.',
      outcomes: ['Yes', 'No'],
      volume: 2130000,
      liquidity: 645000,
      endDate: '2025-06-30T23:59:59Z',
      active: true,
    },
    {
      id: 'ai-regulation-2025',
      title: 'Major AI regulation passed in US by 2025?',
      description: 'Comprehensive AI regulation at federal level.',
      outcomes: ['Yes', 'No'],
      volume: 890000,
      liquidity: 320000,
      endDate: '2025-12-31T23:59:59Z',
      active: true,
    },
  ];
}

function getFallbackPositions(address: string) {
  // Generate deterministic positions based on address
  const seed = address.slice(2, 10);
  const markets = [
    { id: 'btc-100k', market: 'Bitcoin $100k by 2025', outcome: 'Yes' },
    { id: 'eth-5k', market: 'ETH above $5,000 Q2 2025', outcome: 'Yes' },
    { id: 'fed-rates', market: 'Fed cuts rates Jan 2025', outcome: 'No' },
  ];

  const numPositions = (parseInt(seed.slice(0, 2), 16) % 3) + 1;
  
  return markets.slice(0, numPositions).map((m, i) => {
    const entryPrice = 0.3 + (parseInt(seed.slice(i * 2, i * 2 + 2), 16) % 40) / 100;
    const currentPrice = entryPrice + (parseInt(seed.slice(i + 4, i + 6), 16) % 20 - 10) / 100;
    const size = 500 + (parseInt(seed.slice(i, i + 4), 16) % 5000);
    
    return {
      id: `pos-${i + 1}`,
      market_id: m.id,
      market_title: m.market,
      outcome: m.outcome,
      size: size,
      entry_price: Math.max(0.05, Math.min(0.95, entryPrice)),
      current_price: Math.max(0.05, Math.min(0.95, currentPrice)),
      pnl: (currentPrice - entryPrice) * size,
      pnl_percent: ((currentPrice - entryPrice) / entryPrice) * 100,
    };
  });
}

function generateLeaderboardData(limit: number) {
  const traders = [];
  const names = [
    'CryptoWhale', 'PredictionKing', 'MarketMaven', 'BullishBets', 'ElectionPro',
    'SteadyGains', 'NewsTrader', 'AlphaSeeker', 'RiskMaster', 'QuantTrader',
    'DataDriven', 'TrendFollower', 'ContraryView', 'MomentumKing', 'ValueHunter',
    'EventBet', 'MacroMaster', 'MicroBets', 'SwingTrader', 'ScalpKing'
  ];
  
  for (let i = 0; i < Math.min(limit, names.length); i++) {
    const baseRoi = Math.random() * 100 + 20;
    traders.push({
      id: `trader-${i + 1}`,
      address: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`,
      username: names[i],
      avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${names[i].toLowerCase()}`,
      roi: {
        daily: (Math.random() * 10 - 2).toFixed(2),
        weekly: (Math.random() * 30 - 5).toFixed(2),
        monthly: baseRoi.toFixed(2),
        allTime: (baseRoi * (2 + Math.random() * 3)).toFixed(2),
      },
      winRate: (60 + Math.random() * 30).toFixed(1),
      totalVolume: Math.floor(Math.random() * 10000000) + 100000,
      activePositions: Math.floor(Math.random() * 15) + 1,
      riskScore: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
      followers: Math.floor(Math.random() * 5000) + 100,
      isVerified: Math.random() > 0.4,
      trades: Math.floor(Math.random() * 3000) + 50,
    });
  }
  
  // Sort by monthly ROI
  traders.sort((a, b) => parseFloat(b.roi.monthly) - parseFloat(a.roi.monthly));
  
  return traders;
}
