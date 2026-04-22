import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, TrendingUp, Loader2 } from 'lucide-react';
import { Navbar } from '@/components/ui/Navbar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MarketCard } from '@/components/trading/MarketCard';
import { useMarkets } from '@/hooks/usePolymarketTrading';

const Trade = () => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  
  const { data: markets, isLoading, error } = useMarkets(30);

  // Filter markets based on search
  const filteredMarkets = markets?.filter((market) =>
    market.title.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen relative">
      <Navbar />

      <main className="container mx-auto px-4 pt-24 pb-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl sm:text-4xl font-heading font-bold mb-2">
            Trade Markets
          </h1>
          <p className="text-muted-foreground">
            Browse and trade prediction markets directly on Polymarket
          </p>
        </motion.div>

        {/* Search & Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-4 mb-8"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search markets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Tabs value={category} onValueChange={setCategory}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="crypto">Crypto</TabsTrigger>
              <TabsTrigger value="politics">Politics</TabsTrigger>
              <TabsTrigger value="sports">Sports</TabsTrigger>
            </TabsList>
          </Tabs>
        </motion.div>

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass rounded-xl p-4 mb-8 flex items-center justify-between"
        >
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs text-muted-foreground">Total Markets</p>
              <p className="text-lg font-bold">{markets?.length || 0}</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="text-xs text-muted-foreground">Total Volume</p>
              <p className="text-lg font-bold">
                ${((markets?.reduce((sum, m) => sum + m.volume, 0) || 0) / 1_000_000).toFixed(1)}M
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-primary">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-medium">Live Prices</span>
          </div>
        </motion.div>

        {/* Markets Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-destructive mb-4">Failed to load markets</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        ) : filteredMarkets.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No markets found</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredMarkets.map((market) => (
              <MarketCard key={market.id} market={market} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Trade;
