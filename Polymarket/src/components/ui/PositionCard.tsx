import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, X } from 'lucide-react';
import { Button } from './button';
import { Position, formatCurrency, formatPercent } from '@/lib/mockData';
import { cn } from '@/lib/utils';

interface PositionCardProps {
  position: Position;
  delay?: number;
  onClose?: () => void;
}

export const PositionCard = ({ position, delay = 0, onClose }: PositionCardProps) => {
  const isPositive = position.pnl >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay }}
      className="glass glass-hover rounded-xl p-4"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-heading font-medium text-sm truncate mb-1">
            {position.market}
          </p>
          <div className="flex items-center gap-2">
            <span className={cn(
              "px-2 py-0.5 rounded text-xs font-medium",
              position.type === 'long' 
                ? "bg-success/10 text-success" 
                : "bg-destructive/10 text-destructive"
            )}>
              {position.outcome}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatCurrency(position.size)} @ {position.entryPrice.toFixed(2)}
            </span>
          </div>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-muted-foreground hover:text-destructive"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Current Price</p>
          <p className="font-semibold">{position.currentPrice.toFixed(2)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground mb-1">PnL</p>
          <div className={cn(
            "flex items-center gap-1 font-semibold",
            isPositive ? "text-success" : "text-destructive"
          )}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{formatCurrency(position.pnl)}</span>
            <span className="text-sm">({formatPercent(position.pnlPercent)})</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(Math.abs(position.pnlPercent), 100)}%` }}
          transition={{ duration: 0.8, delay: delay + 0.2 }}
          className={cn(
            "h-full rounded-full",
            isPositive ? "bg-success" : "bg-destructive"
          )}
        />
      </div>
    </motion.div>
  );
};
