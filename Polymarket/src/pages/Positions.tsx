import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, X, Wallet, AlertCircle } from 'lucide-react';
import { Navbar } from '@/components/ui/Navbar';
import { Background3D } from '@/components/ui/Background3D';
import { Button } from '@/components/ui/button';
import { useUserPositions, useClosePosition } from '@/hooks/useCopyTrading';
import { useWallet } from '@/contexts/WalletContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { formatCurrency, formatPercent } from '@/lib/mockData';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const Positions = () => {
  const { user, isConnected, connect } = useWallet();
  const { data: positions, isLoading, refetch } = useUserPositions();
  const closePosition = useClosePosition();
  const queryClient = useQueryClient();

  // Real-time subscription for positions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('positions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'positions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['user-positions'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const totalPnL = positions?.reduce((sum, pos) => sum + (pos.pnl || 0), 0) || 0;
  const totalValue = positions?.reduce((sum, pos) => sum + pos.size, 0) || 0;

  const handleClosePosition = (positionId: string) => {
    closePosition.mutate(positionId);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen relative">
        <Background3D />
        <Navbar />
        <main className="container mx-auto px-4 pt-24 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center min-h-[60vh] text-center"
          >
            <div className="glass rounded-2xl p-8 max-w-md">
              <Wallet className="w-16 h-16 mx-auto mb-4 text-primary" />
              <h2 className="text-2xl font-heading font-bold mb-2">Connect Your Wallet</h2>
              <p className="text-muted-foreground mb-6">
                Connect your wallet to view and manage your positions.
              </p>
              <Button onClick={connect} size="lg" className="w-full">
                Connect Wallet
              </Button>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <Background3D />
      <Navbar />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-heading font-bold mb-2">
              Your Positions
            </h1>
            <p className="text-muted-foreground">
              Track and manage your open trades in real-time
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </motion.div>

        {/* Summary Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
        >
          <div className="glass rounded-xl p-6">
            <p className="text-sm text-muted-foreground mb-1">Open Positions</p>
            <p className="text-3xl font-heading font-bold">{positions?.length || 0}</p>
          </div>
          <div className="glass rounded-xl p-6">
            <p className="text-sm text-muted-foreground mb-1">Total Value</p>
            <p className="text-3xl font-heading font-bold">{formatCurrency(totalValue)}</p>
          </div>
          <div className="glass rounded-xl p-6">
            <p className="text-sm text-muted-foreground mb-1">Total PnL</p>
            <div className={cn(
              "flex items-center gap-2 text-3xl font-heading font-bold",
              totalPnL >= 0 ? "text-success" : "text-destructive"
            )}>
              {totalPnL >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
              {formatCurrency(totalPnL)}
            </div>
          </div>
        </motion.div>

        {/* Positions Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-xl overflow-hidden"
        >
          {isLoading ? (
            <div className="p-12 text-center">
              <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Loading positions...</p>
            </div>
          ) : positions && positions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead>Market</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                  <TableHead className="text-right">Entry</TableHead>
                  <TableHead className="text-right">Current</TableHead>
                  <TableHead className="text-right">PnL</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((position, index) => {
                  const isPositive = (position.pnl || 0) >= 0;
                  return (
                    <motion.tr
                      key={position.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-border/50"
                    >
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {position.market_title}
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "px-2 py-1 rounded text-xs font-medium",
                          position.outcome === 'Yes' 
                            ? "bg-success/10 text-success" 
                            : "bg-destructive/10 text-destructive"
                        )}>
                          {position.outcome}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "px-2 py-1 rounded text-xs font-medium capitalize",
                          position.position_type === 'long' 
                            ? "bg-primary/10 text-primary" 
                            : "bg-muted text-muted-foreground"
                        )}>
                          {position.position_type}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(position.size)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {position.entry_price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {position.current_price?.toFixed(2) || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className={cn(
                          "flex items-center justify-end gap-1 font-semibold",
                          isPositive ? "text-success" : "text-destructive"
                        )}>
                          {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          <span>{formatCurrency(position.pnl || 0)}</span>
                          <span className="text-xs">
                            ({formatPercent(position.pnl_percent || 0)})
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <X className="w-4 h-4 mr-1" />
                              Close
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="glass border-border">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Close Position?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to close your position in "{position.market_title}"? 
                                This will sell at the current market price.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleClosePosition(position.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Close Position
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="p-12 text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-heading font-semibold mb-2">No Open Positions</h3>
              <p className="text-muted-foreground mb-4">
                You don't have any open positions yet. Start trading or copy a top trader!
              </p>
              <div className="flex gap-4 justify-center">
                <Button variant="outline" asChild>
                  <a href="/trade">Trade Now</a>
                </Button>
                <Button asChild>
                  <a href="/leaderboard">Copy Traders</a>
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default Positions;
