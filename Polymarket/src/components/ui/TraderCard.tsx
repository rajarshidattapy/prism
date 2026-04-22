import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  BadgeCheck, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Activity,
  Shield,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';
import { Button } from './button';
import { Badge } from './badge';
import { formatCurrency, formatPercent } from '@/lib/mockData';
import { cn } from '@/lib/utils';

interface TraderCardTrader {
  id: string;
  username: string;
  avatar?: string;
  address?: string;
  isVerified?: boolean;
  roi: { monthly: number | string; allTime?: number | string; daily?: number | string; weekly?: number | string };
  winRate?: number | string;
  totalVolume?: number;
  activePositions?: number;
  followers?: number;
  riskScore?: string;
  trades?: number;
}

interface TraderCardProps {
  trader: TraderCardTrader;
  rank: number;
  delay?: number;
}

const getRiskIcon = (risk: string) => {
  switch (risk) {
    case 'low':
      return <ShieldCheck className="w-4 h-4 text-success" />;
    case 'medium':
      return <Shield className="w-4 h-4 text-warning" />;
    case 'high':
      return <ShieldAlert className="w-4 h-4 text-destructive" />;
    default:
      return null;
  }
};

const getRiskColor = (risk: string) => {
  switch (risk) {
    case 'low':
      return 'bg-success/10 text-success border-success/20';
    case 'medium':
      return 'bg-warning/10 text-warning border-warning/20';
    case 'high':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    default:
      return '';
  }
};

export const TraderCard = ({ trader, rank, delay = 0 }: TraderCardProps) => {
  const monthlyRoi = typeof trader.roi.monthly === 'string' ? parseFloat(trader.roi.monthly) : trader.roi.monthly;
  const isPositive = monthlyRoi >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="glass glass-hover rounded-xl p-5 group"
    >
      <div className="flex items-start gap-4">
        {/* Rank */}
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center font-heading font-bold text-sm shrink-0",
          rank === 1 && "bg-gradient-to-br from-yellow-400 to-amber-600 text-black",
          rank === 2 && "bg-gradient-to-br from-gray-300 to-gray-500 text-black",
          rank === 3 && "bg-gradient-to-br from-amber-600 to-amber-800 text-white",
          rank > 3 && "bg-muted text-muted-foreground"
        )}>
          {rank}
        </div>

        {/* Avatar & Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-3">
            <img
              src={trader.avatar}
              alt={trader.username}
              className="w-10 h-10 rounded-full bg-muted"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-heading font-semibold truncate">
                  {trader.username}
                </span>
                {trader.isVerified && (
                  <BadgeCheck className="w-4 h-4 text-primary shrink-0" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">{trader.address}</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Monthly ROI</p>
                <div className={cn(
                  "flex items-center gap-1 font-semibold",
                  isPositive ? "text-success" : "text-destructive"
                )}>
                  {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {formatPercent(monthlyRoi)}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
                <p className="font-semibold">{trader.winRate || 0}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Volume</p>
                <p className="font-semibold">{formatCurrency(trader.totalVolume || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Positions</p>
                <p className="font-semibold">{trader.activePositions || 0}</p>
              </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                {(trader.followers || 0).toLocaleString()}
              </div>
              {trader.riskScore && (
                <Badge variant="outline" className={getRiskColor(trader.riskScore)}>
                  {getRiskIcon(trader.riskScore)}
                  <span className="ml-1 capitalize">{trader.riskScore}</span>
                </Badge>
              )}
            </div>
            <Link to={`/copy?trader=${trader.id}`}>
              <Button size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                Copy
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
