import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Loader2, Wallet, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWallet } from '@/contexts/WalletContext';
import { usePlaceOrder, useTokenPrice } from '@/hooks/usePolymarketTrading';

interface TradePanelProps {
  market: {
    id: string;
    title: string;
    outcomes: string[];
    tokens?: { token_id: string; outcome: string; price: number }[];
  };
  onClose?: () => void;
}

export function TradePanel({ market, onClose }: TradePanelProps) {
  const { isConnected, connect, address } = useWallet();
  
  // Parse outcomes if it's a string (API sometimes returns JSON string)
  const outcomes: string[] = Array.isArray(market.outcomes) 
    ? market.outcomes 
    : typeof market.outcomes === 'string' 
      ? (() => { try { return JSON.parse(market.outcomes); } catch { return ['Yes', 'No']; } })()
      : ['Yes', 'No'];
  
  const [selectedOutcome, setSelectedOutcome] = useState<string>(outcomes[0] || 'Yes');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [amount, setAmount] = useState<string>('10');
  const [limitPrice, setLimitPrice] = useState<string>('0.50');

  const placeOrder = usePlaceOrder();
  
  // Get token for selected outcome
  const selectedToken = market.tokens?.find(t => t.outcome === selectedOutcome);
  const tokenId = selectedToken?.token_id || market.id;
  
  const { data: currentPrice } = useTokenPrice(tokenId);
  const displayPrice = currentPrice || selectedToken?.price || 0.5;

  const shares = parseFloat(amount) / displayPrice;
  const potentialProfit = side === 'BUY' 
    ? (1 - displayPrice) * shares 
    : displayPrice * shares;

  const handleSubmit = async () => {
    if (!isConnected) {
      connect();
      return;
    }

    const price = orderType === 'market' ? displayPrice : parseFloat(limitPrice);
    
    await placeOrder.mutateAsync({
      tokenId,
      side,
      price,
      size: parseFloat(amount),
      marketTitle: market.title,
      outcome: selectedOutcome,
    });

    onClose?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-6 w-full max-w-md"
    >
      {/* Market Title */}
      <div className="mb-6">
        <h3 className="text-lg font-heading font-semibold line-clamp-2">{market.title}</h3>
      </div>

      {/* Outcome Selection */}
      <div className="mb-6">
        <Label className="text-sm text-muted-foreground mb-2 block">Select Outcome</Label>
        <div className="grid grid-cols-2 gap-2">
          {outcomes.map((outcome) => (
            <Button
              key={outcome}
              variant={selectedOutcome === outcome ? 'default' : 'outline'}
              onClick={() => setSelectedOutcome(outcome)}
              className="h-12"
            >
              {outcome}
              {selectedToken && outcome === selectedOutcome && (
                <span className="ml-2 text-xs opacity-70">
                  ${displayPrice.toFixed(2)}
                </span>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Buy/Sell Tabs */}
      <Tabs value={side} onValueChange={(v) => setSide(v as 'BUY' | 'SELL')} className="mb-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="BUY" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
            <TrendingUp className="w-4 h-4 mr-2" />
            Buy
          </TabsTrigger>
          <TabsTrigger value="SELL" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400">
            <TrendingDown className="w-4 h-4 mr-2" />
            Sell
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Order Type */}
      <div className="mb-6">
        <Label className="text-sm text-muted-foreground mb-2 block">Order Type</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={orderType === 'market' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setOrderType('market')}
          >
            Market
          </Button>
          <Button
            variant={orderType === 'limit' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setOrderType('limit')}
          >
            Limit
          </Button>
        </div>
      </div>

      {/* Amount Input */}
      <div className="mb-4">
        <Label className="text-sm text-muted-foreground mb-2 block">Amount (USDC)</Label>
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="10.00"
          min="1"
          step="1"
          className="text-lg"
        />
        <div className="flex gap-2 mt-2">
          {[10, 25, 50, 100].map((val) => (
            <Button
              key={val}
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => setAmount(val.toString())}
            >
              ${val}
            </Button>
          ))}
        </div>
      </div>

      {/* Limit Price (for limit orders) */}
      {orderType === 'limit' && (
        <div className="mb-4">
          <Label className="text-sm text-muted-foreground mb-2 block">Limit Price</Label>
          <div className="relative">
            <Input
              type="number"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              placeholder="0.50"
              min="0.01"
              max="0.99"
              step="0.01"
              className="text-lg pr-12"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              ¢
            </span>
          </div>
          <Slider
            value={[parseFloat(limitPrice) * 100]}
            onValueChange={([val]) => setLimitPrice((val / 100).toFixed(2))}
            min={1}
            max={99}
            step={1}
            className="mt-3"
          />
        </div>
      )}

      {/* Order Summary */}
      <div className="glass rounded-xl p-4 mb-6 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Price per share</span>
          <span>${orderType === 'market' ? displayPrice.toFixed(2) : limitPrice}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Shares</span>
          <span>{shares.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Max cost</span>
          <span>${parseFloat(amount).toFixed(2)}</span>
        </div>
        <div className="border-t border-border/50 pt-2 flex justify-between font-medium">
          <span className={potentialProfit >= 0 ? 'text-green-400' : 'text-red-400'}>
            Potential {side === 'BUY' ? 'Profit' : 'Return'}
          </span>
          <span className={potentialProfit >= 0 ? 'text-green-400' : 'text-red-400'}>
            ${potentialProfit.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Warning for Solana Devnet */}
      {isConnected && (
        <div className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-warning/10 border border-warning/20">
          <AlertCircle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
          <p className="text-xs text-warning">
            Testnet mode: Trades are simulated on Solana Devnet. No real funds required.
          </p>
        </div>
      )}

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={placeOrder.isPending || parseFloat(amount) <= 0}
        className={`w-full h-12 text-base font-semibold ${
          !isConnected
            ? ''
            : side === 'BUY' 
              ? 'bg-green-500 hover:bg-green-600' 
              : 'bg-red-500 hover:bg-red-600'
        }`}
      >
        {!isConnected ? (
          <>
            <Wallet className="w-5 h-5 mr-2" />
            Connect Wallet
          </>
        ) : placeOrder.isPending ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Signing Order...
          </>
        ) : (
          <>
            {side === 'BUY' ? 'Buy' : 'Sell'} {selectedOutcome}
          </>
        )}
      </Button>

      {/* Connected Address */}
      {isConnected && address && (
        <p className="text-xs text-muted-foreground text-center mt-3">
          Connected: {address.slice(0, 6)}...{address.slice(-4)}
        </p>
      )}
    </motion.div>
  );
}

export default TradePanel;
