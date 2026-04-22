import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';
import { Trade, formatCurrency } from '@/lib/mockData';
import { cn } from '@/lib/utils';

interface TradeHistoryItemProps {
  trade: Trade;
  delay?: number;
}

export const TradeHistoryItem = ({ trade, delay = 0 }: TradeHistoryItemProps) => {
  const isBuy = trade.type === 'buy';

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay }}
      className="flex items-center gap-4 py-3 px-4 rounded-lg hover:bg-muted/50 transition-colors"
    >
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
        isBuy ? "bg-success/10" : "bg-destructive/10"
      )}>
        {isBuy ? (
          <ArrowUpRight className="w-4 h-4 text-success" />
        ) : (
          <ArrowDownRight className="w-4 h-4 text-destructive" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm truncate">{trade.market}</span>
          <span className={cn(
            "px-1.5 py-0.5 rounded text-xs font-medium uppercase",
            isBuy ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
          )}>
            {trade.type}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{trade.traderName}</span>
          <span>•</span>
          <span>{trade.outcome} @ {trade.price.toFixed(2)}</span>
        </div>
      </div>

      <div className="text-right shrink-0">
        <p className="font-semibold text-sm">{formatCurrency(trade.size)}</p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {new Date(trade.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
    </motion.div>
  );
};
