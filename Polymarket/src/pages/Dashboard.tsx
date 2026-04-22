import { motion } from 'framer-motion';
import { 
  DollarSign, 
  TrendingUp,
  Activity, 
  Users,
  Wallet,
  Loader2
} from 'lucide-react';
import { Navbar } from '@/components/ui/Navbar';
import { StatCard } from '@/components/ui/StatCard';
import { PositionCard } from '@/components/ui/PositionCard';
import { CopySubscriptionCard } from '@/components/ui/CopySubscriptionCard';
import { TradeHistoryItem } from '@/components/ui/TradeHistoryItem';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useWallet } from '@/contexts/WalletContext';
import { useCopySubscriptions, useUserPositions, useUserTrades, useUpdateSubscription } from '@/hooks/useCopyTrading';
import { 
  mockPositions, 
  mockTrades, 
  performanceData,
  formatCurrency 
} from '@/lib/mockData';
import { 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  CartesianGrid,
  Area,
  AreaChart
} from 'recharts';

const Dashboard = () => {
  const { isConnected, connect, isConnecting, address } = useWallet();
  const { data: subscriptions, isLoading: subsLoading } = useCopySubscriptions();
  const { data: positions } = useUserPositions();
  const { data: trades } = useUserTrades();
  const updateSubscription = useUpdateSubscription();

  // Use mock data if not connected or no real data
  const displayPositions = positions?.length ? positions : mockPositions;
  const displayTrades = trades?.length ? trades : mockTrades;
  
  const totalPnl = subscriptions?.reduce((acc, sub) => acc + Number(sub.total_pnl || 0), 0) || 2296.60;
  const totalAllocation = subscriptions?.reduce((acc, sub) => acc + Number(sub.allocation || 0), 0) || 10000;
  const activeSubscriptions = subscriptions?.filter(s => s.status === 'active').length || 2;

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background noise-bg">
        <Navbar />
        <main className="container mx-auto px-4 pt-24 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-3xl p-12 text-center max-w-2xl mx-auto mt-20"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Wallet className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-heading font-bold mb-3">Connect Your Wallet</h2>
            <p className="text-muted-foreground mb-8">
              Connect your wallet to view your dashboard, manage copy trades, and track your performance.
            </p>
            <Button onClick={connect} disabled={isConnecting} size="lg" className="glow-hover">
              {isConnecting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Wallet className="w-4 h-4 mr-2" />
              )}
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </Button>
          </motion.div>
        </main>
      </div>
    );
  }

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
          <h1 className="text-3xl sm:text-4xl font-heading font-bold mb-2">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Track your copy trading performance and manage positions
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total PnL"
            value={formatCurrency(totalPnl)}
            change="+24.5% this month"
            changeType="positive"
            icon={TrendingUp}
            delay={0.1}
          />
          <StatCard
            title="Total Allocated"
            value={formatCurrency(totalAllocation)}
            change={`${subscriptions?.length || 3} traders`}
            changeType="neutral"
            icon={DollarSign}
            delay={0.15}
          />
          <StatCard
            title="Active Copies"
            value={activeSubscriptions.toString()}
            change={`${(subscriptions?.length || 3) - activeSubscriptions} paused`}
            changeType="neutral"
            icon={Users}
            delay={0.2}
          />
          <StatCard
            title="Open Positions"
            value={displayPositions.length.toString()}
            change={`${displayPositions.filter((p: any) => (p.pnl || 0) > 0).length} in profit`}
            changeType="positive"
            icon={Activity}
            delay={0.25}
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Chart & Positions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Performance Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="glass rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-heading font-semibold">Performance</h2>
                  <p className="text-sm text-muted-foreground">Cumulative PnL over time</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="text-sm text-muted-foreground">PnL</span>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={performanceData}>
                    <defs>
                      <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      stroke="hsl(220, 16%, 15%)" 
                      vertical={false}
                    />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(220, 10%, 50%)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="hsl(220, 10%, 50%)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(220, 20%, 7%)',
                        border: '1px solid hsl(220, 16%, 15%)',
                        borderRadius: '12px',
                      }}
                      labelStyle={{ color: 'hsl(0, 0%, 95%)' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="cumulative"
                      stroke="hsl(160, 84%, 39%)"
                      strokeWidth={2}
                      fill="url(#pnlGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Open Positions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="glass rounded-2xl p-6"
            >
              <h2 className="text-lg font-heading font-semibold mb-4">Open Positions</h2>
              <div className="space-y-3">
                {displayPositions.slice(0, 4).map((position: any, index: number) => (
                  <PositionCard
                    key={position.id}
                    position={position}
                    delay={0.1 + index * 0.05}
                  />
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right Column - Subscriptions & History */}
          <div className="space-y-6">
            {/* Copy Subscriptions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-heading font-semibold">Active Copies</h2>
                <Link to="/leaderboard">
                  <Button variant="ghost" size="sm">Add Trader</Button>
                </Link>
              </div>
              {subsLoading ? (
                <div className="glass rounded-2xl p-8 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Show mock data for demo */}
                  <CopySubscriptionCard
                    subscription={{
                      id: 'demo-1',
                      traderId: '1',
                      traderName: 'PredictionKing',
                      traderAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=king',
                      allocation: 5000,
                      maxTradeSize: 1000,
                      riskMultiplier: 1.5,
                      maxOpenPositions: 5,
                      stopLoss: 20,
                      status: 'active',
                      totalPnl: 1247.50,
                      startedAt: '2024-09-15',
                    }}
                    delay={0.1}
                    onPause={() => {}}
                    onResume={() => {}}
                    onStop={() => {}}
                    onSettings={() => {}}
                  />
                  <CopySubscriptionCard
                    subscription={{
                      id: 'demo-2',
                      traderId: '2',
                      traderName: 'MarketMaven',
                      traderAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=maven',
                      allocation: 3000,
                      maxTradeSize: 500,
                      riskMultiplier: 1.0,
                      maxOpenPositions: 3,
                      stopLoss: 15,
                      status: 'active',
                      totalPnl: 892.30,
                      startedAt: '2024-10-01',
                    }}
                    delay={0.15}
                    onPause={() => {}}
                    onResume={() => {}}
                    onStop={() => {}}
                    onSettings={() => {}}
                  />
                </div>
              )}
            </motion.div>

            {/* Recent Trades */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.45 }}
              className="glass rounded-2xl p-6"
            >
              <h2 className="text-lg font-heading font-semibold mb-4">Recent Trades</h2>
              <div className="space-y-1">
                {displayTrades.slice(0, 5).map((trade: any, index: number) => (
                  <TradeHistoryItem
                    key={trade.id}
                    trade={trade}
                    delay={0.1 + index * 0.05}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
