import { motion } from 'framer-motion';
import { Pause, Play, X, Settings, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from './button';
import { Badge } from './badge';
import { CopySubscription, formatCurrency, formatPercent } from '@/lib/mockData';
import { cn } from '@/lib/utils';

interface CopySubscriptionCardProps {
  subscription: CopySubscription;
  delay?: number;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
  onSettings?: () => void;
}

export const CopySubscriptionCard = ({
  subscription,
  delay = 0,
  onPause,
  onResume,
  onStop,
  onSettings,
}: CopySubscriptionCardProps) => {
  const isPositive = subscription.totalPnl >= 0;
  const isActive = subscription.status === 'active';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="glass rounded-xl p-5 relative overflow-hidden"
    >
      {/* Status Indicator */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-1",
        isActive ? "bg-success" : "bg-warning"
      )} />

      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <img
            src={subscription.traderAvatar}
            alt={subscription.traderName}
            className="w-12 h-12 rounded-full bg-muted"
          />
          <div>
            <p className="font-heading font-semibold">{subscription.traderName}</p>
            <Badge
              variant="outline"
              className={cn(
                "mt-1",
                isActive
                  ? "bg-success/10 text-success border-success/20"
                  : "bg-warning/10 text-warning border-warning/20"
              )}
            >
              {isActive ? 'Active' : 'Paused'}
            </Badge>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground mb-1">Total PnL</p>
          <div className={cn(
            "flex items-center gap-1 font-heading font-bold",
            isPositive ? "text-success" : "text-destructive"
          )}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {formatCurrency(subscription.totalPnl)}
          </div>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 py-3 border-y border-border/50">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Allocation</p>
          <p className="font-semibold">{formatCurrency(subscription.allocation)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Max Trade</p>
          <p className="font-semibold">{formatCurrency(subscription.maxTradeSize)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Risk</p>
          <p className="font-semibold">{subscription.riskMultiplier}x</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Stop Loss</p>
          <p className="font-semibold">{subscription.stopLoss}%</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {isActive ? (
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onPause}
          >
            <Pause className="w-4 h-4 mr-2" />
            Pause
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={onResume}
          >
            <Play className="w-4 h-4 mr-2" />
            Resume
          </Button>
        )}
        <Button
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={onSettings}
        >
          <Settings className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="shrink-0 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
          onClick={onStop}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
};
