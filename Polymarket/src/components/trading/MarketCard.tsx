import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Clock, DollarSign, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { TradePanel } from './TradePanel';

interface MarketCardProps {
  market: {
    id: string;
    title: string;
    description?: string;
    outcomes: string[];
    volume: number;
    liquidity: number;
    endDate: string;
    active: boolean;
    image?: string;
    tokens?: { token_id: string; outcome: string; price: number }[];
  };
}

export function MarketCard({ market }: MarketCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const formatVolume = (vol: number) => {
    if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(1)}M`;
    if (vol >= 1_000) return `$${(vol / 1_000).toFixed(0)}K`;
    return `$${vol.toFixed(0)}`;
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Get Yes/No prices if available
  const yesPrice = market.tokens?.find(t => t.outcome === 'Yes')?.price;
  const noPrice = market.tokens?.find(t => t.outcome === 'No')?.price;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass glass-hover rounded-2xl p-5 group"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <h3 className="text-base font-heading font-semibold leading-snug line-clamp-2 flex-1">
          {market.title}
        </h3>
        {market.active && (
          <Badge variant="outline" className="shrink-0 text-xs bg-green-500/10 text-green-400 border-green-500/30">
            Active
          </Badge>
        )}
      </div>

      {/* Price Display */}
      {(yesPrice !== undefined || noPrice !== undefined) && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Yes</p>
            <p className="text-lg font-bold text-green-400">
              {yesPrice !== undefined ? `${(yesPrice * 100).toFixed(0)}¢` : '—'}
            </p>
          </div>
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">No</p>
            <p className="text-lg font-bold text-red-400">
              {noPrice !== undefined ? `${(noPrice * 100).toFixed(0)}¢` : '—'}
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
        <div className="flex items-center gap-1">
          <DollarSign className="w-3.5 h-3.5" />
          <span>{formatVolume(market.volume)} vol</span>
        </div>
        <div className="flex items-center gap-1">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>{formatVolume(market.liquidity)} liq</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatDate(market.endDate)}</span>
        </div>
      </div>

      {/* Trade Button */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="w-full group-hover:bg-primary/90">
            Trade
            <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md bg-transparent border-0 shadow-none">
          <VisuallyHidden>
            <DialogTitle>Trade {market.title}</DialogTitle>
          </VisuallyHidden>
          <TradePanel market={market} onClose={() => setIsOpen(false)} />
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

export default MarketCard;
