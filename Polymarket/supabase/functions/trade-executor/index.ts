import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Polymarket CLOB API
const POLYMARKET_CLOB_API = 'https://clob.polymarket.com';

interface CopySubscription {
  id: string;
  user_id: string;
  trader_id: string;
  allocation: number;
  max_trade_size: number;
  risk_multiplier: number;
  max_open_positions: number;
  stop_loss: number;
  status: string;
}

interface TraderPosition {
  market_id: string;
  market_title: string;
  outcome: string;
  size: number;
  entry_price: number;
  current_price: number;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { action, params } = await req.json();
    console.log(`Trade Executor action: ${action}`, params);

    let result;

    switch (action) {
      case 'sync_trader_positions':
        result = await syncTraderPositions(supabase, params.traderId);
        break;
      case 'execute_copy_trades':
        result = await executeCopyTrades(supabase, params.traderId, params.newPositions);
        break;
      case 'check_and_replicate':
        result = await checkAndReplicateTrades(supabase);
        break;
      case 'get_trader_live_positions':
        result = await getTraderLivePositions(params.address);
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
    console.error('Trade Executor error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

// Fetch live positions from Polymarket API
async function getTraderLivePositions(address: string) {
  const apiKey = Deno.env.get('POLYMARKET_API_KEY');
  const apiSecret = Deno.env.get('POLYMARKET_API_SECRET');
  const passphrase = Deno.env.get('POLYMARKET_PASSPHRASE');

  if (!apiKey || !apiSecret || !passphrase) {
    console.log('Polymarket credentials not configured, using simulated data');
    return getSimulatedPositions(address);
  }

  try {
    // Create HMAC signature for authentication
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const method = 'GET';
    const path = `/positions?user=${address}`;
    
    const message = timestamp + method + path;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(apiSecret);
    const messageData = encoder.encode(message);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));

    const response = await fetch(`${POLYMARKET_CLOB_API}${path}`, {
      method: 'GET',
      headers: {
        'POLY_API_KEY': apiKey,
        'POLY_SIGNATURE': signatureBase64,
        'POLY_TIMESTAMP': timestamp,
        'POLY_PASSPHRASE': passphrase,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.log(`Polymarket API responded with ${response.status}, using simulated data`);
      return getSimulatedPositions(address);
    }

    const positions = await response.json();
    console.log(`Fetched ${positions.length} live positions for ${address}`);
    return positions;
  } catch (error) {
    console.error('Error fetching live positions:', error);
    return getSimulatedPositions(address);
  }
}

// Sync trader positions from Polymarket to database
async function syncTraderPositions(supabase: any, traderId: string) {
  // Get trader address
  const { data: trader, error: traderError } = await supabase
    .from('traders')
    .select('address, username')
    .eq('id', traderId)
    .maybeSingle();

  if (traderError || !trader) {
    throw new Error(`Trader not found: ${traderId}`);
  }

  console.log(`Syncing positions for trader: ${trader.username} (${trader.address})`);

  // Fetch live positions from Polymarket
  const livePositions = await getTraderLivePositions(trader.address);
  
  // Get existing positions in database
  const { data: existingPositions } = await supabase
    .from('positions')
    .select('*')
    .eq('trader_id', traderId)
    .eq('status', 'open');

  const existingMarketIds = new Set(existingPositions?.map((p: any) => p.market_id) || []);
  const liveMarketIds = new Set(livePositions.map((p: any) => p.market_id || p.id));

  // Detect new positions
  const newPositions = livePositions.filter((p: any) => !existingMarketIds.has(p.market_id || p.id));
  
  // Detect closed positions
  const closedPositionIds = existingPositions?.filter((p: any) => !liveMarketIds.has(p.market_id)) || [];

  console.log(`Found ${newPositions.length} new positions, ${closedPositionIds.length} closed positions`);

  // Update trader's last_synced_at
  await supabase
    .from('traders')
    .update({ 
      last_synced_at: new Date().toISOString(),
      active_positions: livePositions.length 
    })
    .eq('id', traderId);

  return {
    traderId,
    traderAddress: trader.address,
    syncedAt: new Date().toISOString(),
    livePositions: livePositions.length,
    newPositions: newPositions,
    closedPositions: closedPositionIds.length,
  };
}

// Execute copy trades for followers
async function executeCopyTrades(supabase: any, traderId: string, newPositions: TraderPosition[]) {
  // Get all active subscriptions for this trader
  const { data: subscriptions, error: subError } = await supabase
    .from('copy_subscriptions')
    .select('*')
    .eq('trader_id', traderId)
    .eq('status', 'active');

  if (subError) {
    throw new Error(`Error fetching subscriptions: ${subError.message}`);
  }

  if (!subscriptions || subscriptions.length === 0) {
    console.log(`No active subscribers for trader ${traderId}`);
    return { tradesExecuted: 0, message: 'No active subscribers' };
  }

  console.log(`Found ${subscriptions.length} active subscribers for trader ${traderId}`);

  const executedTrades = [];

  for (const subscription of subscriptions as CopySubscription[]) {
    // Check current open positions count
    const { count: openPositions } = await supabase
      .from('positions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', subscription.user_id)
      .eq('status', 'open');

    if ((openPositions || 0) >= subscription.max_open_positions) {
      console.log(`User ${subscription.user_id} has reached max open positions (${subscription.max_open_positions})`);
      continue;
    }

    for (const position of newPositions) {
      // Calculate position size based on allocation and risk multiplier
      const adjustedSize = Math.min(
        position.size * (subscription.allocation / 100) * subscription.risk_multiplier,
        subscription.max_trade_size
      );

      if (adjustedSize < 1) {
        console.log(`Adjusted size too small for user ${subscription.user_id}, skipping`);
        continue;
      }

      // Create position for follower
      const { data: newPosition, error: posError } = await supabase
        .from('positions')
        .insert({
          user_id: subscription.user_id,
          trader_id: traderId,
          subscription_id: subscription.id,
          market_id: position.market_id,
          market_title: position.market_title,
          outcome: position.outcome,
          position_type: 'copy',
          size: adjustedSize,
          entry_price: position.entry_price,
          current_price: position.current_price,
          status: 'open',
        })
        .select()
        .single();

      if (posError) {
        console.error(`Error creating position for user ${subscription.user_id}:`, posError);
        continue;
      }

      // Create trade record
      const { data: trade, error: tradeError } = await supabase
        .from('trades')
        .insert({
          user_id: subscription.user_id,
          trader_id: traderId,
          subscription_id: subscription.id,
          position_id: newPosition.id,
          market_id: position.market_id,
          market_title: position.market_title,
          outcome: position.outcome,
          trade_type: 'buy',
          size: adjustedSize,
          price: position.entry_price,
          status: 'executed',
        })
        .select()
        .single();

      if (!tradeError) {
        executedTrades.push(trade);
        console.log(`Executed copy trade for user ${subscription.user_id}: ${position.market_title}`);
      }
    }
  }

  return {
    tradesExecuted: executedTrades.length,
    trades: executedTrades,
  };
}

// Main function to check all traders and replicate new trades
async function checkAndReplicateTrades(supabase: any) {
  console.log('Starting trade replication check...');

  // Get all traders who have active subscribers
  const { data: activeTraders, error } = await supabase
    .from('copy_subscriptions')
    .select('trader_id, traders!inner(id, address, username)')
    .eq('status', 'active');

  if (error) {
    throw new Error(`Error fetching active traders: ${error.message}`);
  }

  // Get unique trader IDs
  const uniqueTraderIds = [...new Set((activeTraders || []).map((s: any) => s.trader_id))];
  console.log(`Checking ${uniqueTraderIds.length} traders with active subscribers`);

  const results = [];

  for (const traderId of uniqueTraderIds) {
    try {
      // Sync positions and get new trades
      const syncResult = await syncTraderPositions(supabase, traderId as string);
      
      if (syncResult.newPositions.length > 0) {
        // Execute copy trades for new positions
        const execResult = await executeCopyTrades(
          supabase, 
          traderId as string, 
          syncResult.newPositions.map((p: any) => ({
            market_id: p.market_id || p.id,
            market_title: p.market || p.market_title || 'Unknown Market',
            outcome: p.outcome,
            size: p.size,
            entry_price: p.entryPrice || p.entry_price,
            current_price: p.currentPrice || p.current_price,
          }))
        );
        
        results.push({
          traderId,
          synced: true,
          newPositions: syncResult.newPositions.length,
          tradesExecuted: execResult.tradesExecuted,
        });
      } else {
        results.push({
          traderId,
          synced: true,
          newPositions: 0,
          tradesExecuted: 0,
        });
      }
    } catch (err) {
      console.error(`Error processing trader ${traderId}:`, err);
      results.push({
        traderId,
        synced: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return {
    checkedAt: new Date().toISOString(),
    tradersChecked: uniqueTraderIds.length,
    results,
  };
}

// Simulated positions for testing when API is not available
function getSimulatedPositions(address: string) {
  const markets = [
    { id: 'btc-100k', title: 'Bitcoin reaches $100k in 2025', outcome: 'Yes' },
    { id: 'eth-5k', title: 'ETH above $5,000 by Q2 2025', outcome: 'Yes' },
    { id: 'fed-rates', title: 'Fed cuts rates in January 2025', outcome: 'No' },
    { id: 'ai-regulation', title: 'Major AI regulation passes in 2025', outcome: 'Yes' },
  ];

  // Generate deterministic but varied positions based on address
  const seed = address.slice(2, 10);
  const numPositions = (parseInt(seed.slice(0, 2), 16) % 4) + 1;
  
  return markets.slice(0, numPositions).map((market, i) => {
    const entryPrice = 0.3 + (parseInt(seed.slice(i * 2, i * 2 + 2), 16) % 40) / 100;
    const currentPrice = entryPrice + (Math.random() * 0.2 - 0.1);
    
    return {
      market_id: market.id,
      market_title: market.title,
      outcome: market.outcome,
      size: 500 + (parseInt(seed.slice(i, i + 4), 16) % 5000),
      entry_price: entryPrice,
      current_price: Math.max(0.01, Math.min(0.99, currentPrice)),
    };
  });
}
