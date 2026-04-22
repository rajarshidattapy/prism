import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, 
  LayoutDashboard, 
  Trophy, 
  Copy, 
  Settings, 
  Menu, 
  X,
  TrendingUp,
  LogOut,
  Loader2,
  LineChart,
  Briefcase
} from 'lucide-react';
import { Button } from './button';
import { useWallet } from '@/contexts/WalletContext';

const navLinks = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/trade', label: 'Trade', icon: LineChart },
  { path: '/positions', label: 'Positions', icon: Briefcase },
  { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { path: '/copy', label: 'Copy Trading', icon: Copy },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export const Navbar = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { address, isConnected, isConnecting, connect, disconnect, network } = useWallet();

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/30">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center glow-hover transition-all">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <span className="font-heading font-bold text-lg">PolyCopy</span>
              <span className="ml-2 px-2 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded-full">
                BETA
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1 bg-secondary/50 rounded-xl p-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link key={link.path} to={link.path}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`relative px-4 rounded-lg ${
                      isActive 
                        ? 'bg-card text-primary shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {link.label}
                  </Button>
                </Link>
              );
            })}
          </div>

          {/* Connect Wallet Button */}
          <div className="flex items-center gap-3">
            {isConnected ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm font-medium">{shortenAddress(address!)}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/20 text-warning font-medium uppercase">
                    {network}
                  </span>
                </div>
                <Button
                  onClick={disconnect}
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                onClick={connect}
                disabled={isConnecting}
                className="glow-hover"
              >
                {isConnecting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Wallet className="w-4 h-4 mr-2" />
                )}
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </Button>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass border-t border-border/30"
          >
            <div className="container mx-auto px-4 py-4 space-y-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsOpen(false)}
                  >
                    <div
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {link.label}
                    </div>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
