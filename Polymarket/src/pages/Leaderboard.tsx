import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Navbar } from '@/components/ui/Navbar';
import { TraderCard } from '@/components/ui/TraderCard';
import { usePolymarketLeaderboard } from '@/hooks/usePolymarket';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type TimeFilter = 'daily' | 'weekly' | 'monthly' | 'allTime';
type SortBy = 'roi' | 'volume' | 'winRate' | 'followers';

const Leaderboard = () => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('monthly');
  const [sortBy, setSortBy] = useState<SortBy>('roi');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: traders, isLoading, error, refetch, isFetching } = usePolymarketLeaderboard(20);

  const filteredTraders = (traders || [])
    .filter(
      (trader) =>
        trader.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trader.address.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'roi':
          return parseFloat(b.roi[timeFilter]) - parseFloat(a.roi[timeFilter]);
        case 'volume':
          return b.totalVolume - a.totalVolume;
        case 'winRate':
          return parseFloat(b.winRate) - parseFloat(a.winRate);
        case 'followers':
          return b.followers - a.followers;
        default:
          return 0;
      }
    });

  return (
    <div className="min-h-screen bg-background noise-bg">
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
                Trader Leaderboard
              </h1>
              <p className="text-muted-foreground">
                Discover and copy the top performing Polymarket traders
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass rounded-2xl p-4 mb-6"
        >
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary/50 border-border/50"
              />
            </div>

            {/* Time Filter */}
            <Tabs
              value={timeFilter}
              onValueChange={(v) => setTimeFilter(v as TimeFilter)}
            >
              <TabsList className="bg-secondary/50">
                <TabsTrigger value="daily">Today</TabsTrigger>
                <TabsTrigger value="weekly">Week</TabsTrigger>
                <TabsTrigger value="monthly">Month</TabsTrigger>
                <TabsTrigger value="allTime">All</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Sort */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="bg-secondary/50 border-border/50">
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Sort: {sortBy === 'roi' ? 'ROI' : sortBy === 'volume' ? 'Volume' : sortBy === 'winRate' ? 'Win Rate' : 'Followers'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortBy('roi')}>ROI</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('volume')}>Volume</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('winRate')}>Win Rate</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('followers')}>Followers</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </motion.div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass rounded-2xl p-12 text-center"
          >
            <p className="text-destructive mb-4">Failed to load traders</p>
            <Button onClick={() => refetch()}>Try Again</Button>
          </motion.div>
        )}

        {/* Traders Grid */}
        {!isLoading && !error && (
          <div className="space-y-4">
            {filteredTraders.map((trader, index) => (
              <TraderCard
                key={trader.id}
                trader={{
                  id: trader.id,
                  address: trader.address,
                  username: trader.username,
                  avatar: trader.avatar,
                  roi: {
                    daily: parseFloat(trader.roi.daily),
                    weekly: parseFloat(trader.roi.weekly),
                    monthly: parseFloat(trader.roi.monthly),
                    allTime: parseFloat(trader.roi.allTime),
                  },
                  winRate: parseFloat(trader.winRate),
                  totalVolume: trader.totalVolume,
                  activePositions: trader.activePositions,
                  riskScore: trader.riskScore,
                  followers: trader.followers,
                  isVerified: trader.isVerified,
                  
                  trades: trader.trades,
                }}
                rank={index + 1}
                delay={0.05 + index * 0.03}
              />
            ))}

            {filteredTraders.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass rounded-2xl p-12 text-center"
              >
                <p className="text-muted-foreground">
                  No traders found matching your search.
                </p>
              </motion.div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Leaderboard;
