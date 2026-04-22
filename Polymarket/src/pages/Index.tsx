import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  TrendingUp, 
  Users, 
  Shield, 
  Zap, 
  BarChart3,
  Bot,
  Wallet,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/ui/Navbar';
import { useWallet } from '@/contexts/WalletContext';

const features = [
  {
    icon: TrendingUp,
    title: 'Auto Copy Trades',
    description: 'Mirror trades from top Polymarket traders automatically in real-time.',
  },
  {
    icon: Users,
    title: 'Live Leaderboard',
    description: 'Real-time rankings of the best prediction market traders.',
  },
  {
    icon: Shield,
    title: 'Risk Controls',
    description: 'Set stop-losses, limits, and risk multipliers for each trader.',
  },
  {
    icon: Zap,
    title: 'Instant Execution',
    description: 'Lightning-fast trade replication with smart routing.',
  },
  {
    icon: BarChart3,
    title: 'Live Analytics',
    description: 'Track performance with real-time PnL and metrics.',
  },
  {
    icon: Bot,
    title: 'Telegram Alerts',
    description: 'Get instant notifications via Telegram bot.',
  },
];

const stats = [
  { value: '$12M+', label: 'Volume Copied' },
  { value: '2.5K+', label: 'Active Users' },
  { value: '89%', label: 'Avg Win Rate' },
  { value: '24/7', label: 'Execution' },
];

const Index = () => {
  const { isConnected, connect, isConnecting } = useWallet();

  return (
    <div className="min-h-screen relative">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-28 pb-24 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/8 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-primary/5 rounded-full blur-[100px]" />
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--border)) 1px, transparent 0)',
              backgroundSize: '48px 48px',
            }}
          />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-4xl mx-auto text-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8"
            >
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-sm text-muted-foreground">Live on Polygon</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            </motion.div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-heading font-bold mb-6 leading-[1.1]">
              Copy the Best{' '}
              <br className="hidden sm:block" />
              <span className="gradient-text">Polymarket</span>{' '}
              Traders
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Automatically mirror winning strategies from top prediction market traders. 
              Set your risk, allocate capital, and let the pros trade for you.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {isConnected ? (
                <Link to="/leaderboard">
                  <Button size="lg" className="glow-hover text-base px-8 h-12">
                    Explore Traders
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              ) : (
                <Button 
                  size="lg" 
                  className="glow-hover text-base px-8 h-12"
                  onClick={connect}
                  disabled={isConnecting}
                >
                  <Wallet className="mr-2 w-5 h-5" />
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </Button>
              )}
              <Link to="/leaderboard">
                <Button variant="outline" size="lg" className="text-base px-8 h-12">
                  View Leaderboard
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20 max-w-4xl mx-auto"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                className="glass rounded-2xl p-6 text-center"
              >
                <p className="text-3xl sm:text-4xl font-heading font-bold gradient-text mb-1">
                  {stat.value}
                </p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold mb-4">
              Everything You Need
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Professional-grade tools for automated copy trading on Polymarket
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.08 }}
                  className="glass glass-hover rounded-2xl p-6 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-heading font-semibold mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative glass rounded-3xl p-10 sm:p-14 text-center max-w-4xl mx-auto overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px]" />
            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold mb-4">
                Ready to Start Copy Trading?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-xl mx-auto text-lg">
                Connect your wallet, choose your traders, and start copying winning positions today.
              </p>
              {isConnected ? (
                <Link to="/leaderboard">
                  <Button size="lg" className="glow-hover h-12 px-8">
                    Get Started
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              ) : (
                <Button 
                  size="lg" 
                  className="glow-hover h-12 px-8"
                  onClick={connect}
                  disabled={isConnecting}
                >
                  <Wallet className="mr-2 w-5 h-5" />
                  Connect Wallet
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-heading font-bold">PolyCopy</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 PolyCopy. Built for prediction markets.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
