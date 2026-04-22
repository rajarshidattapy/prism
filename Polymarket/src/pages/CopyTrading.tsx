import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  Gauge, 
  Shield, 
  AlertTriangle,
  Plus,
  Minus,
  Info,
  RefreshCw,
  Activity,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Navbar } from '@/components/ui/Navbar';
import { TraderCard } from '@/components/ui/TraderCard';
import { mockTraders, formatCurrency } from '@/lib/mockData';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@/contexts/WalletContext';
import { useCreateSubscription } from '@/hooks/useCopyTrading';
import { usePolymarketLeaderboard } from '@/hooks/usePolymarket';
import { useTraderPositions, useSyncTraderPositions, useCheckAndReplicateTrades } from '@/hooks/useTradeExecutor';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';

const CopyTrading = () => {
  const [searchParams] = useSearchParams();
  const traderId = searchParams.get('trader');
  const { user, isConnected } = useWallet();
  const { toast } = useToast();

  // Fetch real traders from API
  const { data: traders, isLoading: tradersLoading } = usePolymarketLeaderboard();
  const selectedTrader = traders?.find((t: any) => t.id === traderId) || traders?.[0] || mockTraders[0];

  // Fetch trader's live positions
  const { data: livePositions, isLoading: positionsLoading, refetch: refetchPositions } = useTraderPositions(traderId || undefined);
  
  // Mutations
  const createSubscription = useCreateSubscription();
  const syncPositions = useSyncTraderPositions();
  const checkAndReplicate = useCheckAndReplicateTrades();

  const [settings, setSettings] = useState({
    allocation: 1000,
    maxTradeSize: 200,
    riskMultiplier: 1.0,
    maxOpenPositions: 5,
    stopLoss: 20,
    autoRebalance: true,
    emergencyStop: false,
  });

  const handleStartCopying = async () => {
    if (!isConnected) {
      toast({
        title: "Connect Wallet",
        description: "Please connect your wallet to start copy trading.",
        variant: "destructive",
      });
      return;
    }

    if (!traderId) {
      toast({
        title: "No Trader Selected",
        description: "Please select a trader to copy.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createSubscription.mutateAsync({
        traderId,
        allocation: settings.allocation,
        maxTradeSize: settings.maxTradeSize,
        riskMultiplier: settings.riskMultiplier,
        maxOpenPositions: settings.maxOpenPositions,
        stopLoss: settings.stopLoss,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleSyncPositions = () => {
    if (traderId) {
      syncPositions.mutate(traderId);
    }
  };

  const handleCheckTrades = () => {
    checkAndReplicate.mutate();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 pt-24 pb-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-heading font-bold mb-2">
                Copy Trading Settings
              </h1>
              <p className="text-muted-foreground">
                Configure your copy trading parameters for maximum control
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleSyncPositions}
                disabled={syncPositions.isPending || !traderId}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${syncPositions.isPending ? 'animate-spin' : ''}`} />
                Sync Positions
              </Button>
              <Button
                variant="outline"
                onClick={handleCheckTrades}
                disabled={checkAndReplicate.isPending}
                className="gap-2"
              >
                <Activity className={`w-4 h-4 ${checkAndReplicate.isPending ? 'animate-pulse' : ''}`} />
                Check & Replicate
              </Button>
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left - Trader Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-lg font-heading font-semibold mb-4">
                Selected Trader
              </h2>
              {tradersLoading ? (
                <Skeleton className="h-48 w-full rounded-xl" />
              ) : (
                <TraderCard trader={selectedTrader} rank={1} />
              )}
            </div>

            {/* Quick Stats */}
            <div className="glass rounded-xl p-6">
              <h3 className="font-heading font-semibold mb-4">Trader Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">All-Time ROI</p>
                  <p className="text-xl font-bold text-success">
                    +{selectedTrader?.roi?.allTime || '0'}%
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Total Trades</p>
                  <p className="text-xl font-bold">{selectedTrader?.trades || 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
                  <p className="text-xl font-bold">{selectedTrader?.winRate || 0}%</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Followers</p>
                  <p className="text-xl font-bold">{(selectedTrader?.followers || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Live Positions */}
            <div className="glass rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-semibold">Live Positions</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetchPositions()}
                  disabled={positionsLoading}
                >
                  <RefreshCw className={`w-4 h-4 ${positionsLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              
              {positionsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : livePositions && livePositions.length > 0 ? (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {livePositions.map((position: any, idx: number) => (
                    <div
                      key={position.id || idx}
                      className="p-4 rounded-lg bg-muted/50 border border-border/50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm line-clamp-1">
                            {position.market_title || position.market}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              position.outcome === 'Yes' 
                                ? 'bg-success/20 text-success' 
                                : 'bg-destructive/20 text-destructive'
                            }`}>
                              {position.outcome}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Size: {formatCurrency(position.size)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`flex items-center gap-1 ${
                            (position.pnl_percent || 0) >= 0 ? 'text-success' : 'text-destructive'
                          }`}>
                            {(position.pnl_percent || 0) >= 0 ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            <span className="text-sm font-semibold">
                              {(position.pnl_percent || 0) >= 0 ? '+' : ''}
                              {(position.pnl_percent || 0).toFixed(1)}%
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(position.pnl || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No live positions found
                </p>
              )}
            </div>
          </motion.div>

          {/* Right - Settings */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="glass rounded-xl p-6"
          >
            <h2 className="text-lg font-heading font-semibold mb-6">
              Copy Settings
            </h2>

            <div className="space-y-6">
              {/* Allocation */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    Capital Allocation
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-3.5 h-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Maximum USDC to use for copying this trader
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <span className="font-semibold">{formatCurrency(settings.allocation)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => setSettings(s => ({ ...s, allocation: Math.max(100, s.allocation - 100) }))}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Slider
                    value={[settings.allocation]}
                    onValueChange={([v]) => setSettings(s => ({ ...s, allocation: v }))}
                    min={100}
                    max={10000}
                    step={100}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => setSettings(s => ({ ...s, allocation: Math.min(10000, s.allocation + 100) }))}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Max Trade Size */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-primary" />
                    Max Trade Size
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-3.5 h-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Maximum size for any single trade
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <span className="font-semibold">{formatCurrency(settings.maxTradeSize)}</span>
                </div>
                <Slider
                  value={[settings.maxTradeSize]}
                  onValueChange={([v]) => setSettings(s => ({ ...s, maxTradeSize: v }))}
                  min={50}
                  max={settings.allocation}
                  step={50}
                />
              </div>

              {/* Risk Multiplier */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    Risk Multiplier
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-3.5 h-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Scale trade sizes (0.5x = half, 2x = double)
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <span className="font-semibold">{settings.riskMultiplier}x</span>
                </div>
                <Slider
                  value={[settings.riskMultiplier * 100]}
                  onValueChange={([v]) => setSettings(s => ({ ...s, riskMultiplier: v / 100 }))}
                  min={50}
                  max={300}
                  step={25}
                />
              </div>

              {/* Max Open Positions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Max Open Positions</Label>
                  <Input
                    type="number"
                    value={settings.maxOpenPositions}
                    onChange={(e) => setSettings(s => ({ ...s, maxOpenPositions: parseInt(e.target.value) || 1 }))}
                    className="w-20 text-center"
                    min={1}
                    max={20}
                  />
                </div>
              </div>

              {/* Stop Loss */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    Stop Loss
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-3.5 h-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Auto-stop copying if loss exceeds this %
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <span className="font-semibold text-warning">{settings.stopLoss}%</span>
                </div>
                <Slider
                  value={[settings.stopLoss]}
                  onValueChange={([v]) => setSettings(s => ({ ...s, stopLoss: v }))}
                  min={5}
                  max={50}
                  step={5}
                />
              </div>

              {/* Toggles */}
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    Auto-Rebalance
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-3.5 h-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Automatically adjust position sizes on profits
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Switch
                    checked={settings.autoRebalance}
                    onCheckedChange={(v) => setSettings(s => ({ ...s, autoRebalance: v }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-destructive">
                    Emergency Stop
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-3.5 h-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Immediately close all positions and stop copying
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Switch
                    checked={settings.emergencyStop}
                    onCheckedChange={(v) => {
                      setSettings(s => ({ ...s, emergencyStop: v }));
                      if (v) {
                        toast({
                          title: "Emergency Stop Activated",
                          description: "All positions will be closed.",
                          variant: "destructive",
                        });
                      }
                    }}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleStartCopying}
                className="w-full glow mt-6"
                size="lg"
                disabled={createSubscription.isPending || !isConnected}
              >
                {createSubscription.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : !isConnected ? (
                  'Connect Wallet to Start'
                ) : (
                  `Start Copying ${selectedTrader?.username || 'Trader'}`
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default CopyTrading;
