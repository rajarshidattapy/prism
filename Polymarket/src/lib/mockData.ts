// Mock data for Polymarket Copy Trading Platform

export interface Trader {
  id: string;
  address: string;
  username: string;
  avatar: string;
  roi: {
    daily: number;
    weekly: number;
    monthly: number;
    allTime: number;
  };
  winRate: number;
  totalVolume: number;
  activePositions: number;
  riskScore: 'low' | 'medium' | 'high';
  followers: number;
  isVerified: boolean;
  joinedAt: string;
  trades: number;
}

export interface Position {
  id: string;
  market: string;
  outcome: string;
  type: 'long' | 'short';
  entryPrice: number;
  currentPrice: number;
  size: number;
  pnl: number;
  pnlPercent: number;
  openedAt: string;
}

export interface Trade {
  id: string;
  traderId: string;
  traderName: string;
  market: string;
  outcome: string;
  type: 'buy' | 'sell';
  price: number;
  size: number;
  pnl?: number;
  timestamp: string;
  status: 'executed' | 'pending' | 'failed';
}

export interface CopySubscription {
  id: string;
  traderId: string;
  traderName: string;
  traderAvatar: string;
  allocation: number;
  maxTradeSize: number;
  riskMultiplier: number;
  maxOpenPositions: number;
  stopLoss: number;
  status: 'active' | 'paused';
  totalPnl: number;
  startedAt: string;
}

export const mockTraders: Trader[] = [
  {
    id: '1',
    address: '0x1a2b...3c4d',
    username: 'CryptoWhale',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=whale',
    roi: { daily: 2.4, weekly: 12.8, monthly: 45.2, allTime: 234.5 },
    winRate: 78.5,
    totalVolume: 2450000,
    activePositions: 8,
    riskScore: 'medium',
    followers: 1284,
    isVerified: true,
    joinedAt: '2023-06-15',
    trades: 892,
  },
  {
    id: '2',
    address: '0x5e6f...7g8h',
    username: 'PredictionKing',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=king',
    roi: { daily: 5.1, weekly: 18.3, monthly: 62.7, allTime: 412.3 },
    winRate: 82.1,
    totalVolume: 5120000,
    activePositions: 12,
    riskScore: 'high',
    followers: 2847,
    isVerified: true,
    joinedAt: '2023-03-22',
    trades: 1456,
  },
  {
    id: '3',
    address: '0x9i0j...1k2l',
    username: 'SteadyGains',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=steady',
    roi: { daily: 0.8, weekly: 4.2, monthly: 15.6, allTime: 89.4 },
    winRate: 71.2,
    totalVolume: 890000,
    activePositions: 4,
    riskScore: 'low',
    followers: 567,
    isVerified: false,
    joinedAt: '2023-09-01',
    trades: 234,
  },
  {
    id: '4',
    address: '0x3m4n...5o6p',
    username: 'ElectionPro',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=election',
    roi: { daily: 3.2, weekly: 15.7, monthly: 48.9, allTime: 287.6 },
    winRate: 75.8,
    totalVolume: 3240000,
    activePositions: 6,
    riskScore: 'medium',
    followers: 1923,
    isVerified: true,
    joinedAt: '2023-04-10',
    trades: 678,
  },
  {
    id: '5',
    address: '0x7q8r...9s0t',
    username: 'MarketMaven',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=maven',
    roi: { daily: 4.5, weekly: 21.2, monthly: 72.1, allTime: 523.8 },
    winRate: 85.3,
    totalVolume: 7890000,
    activePositions: 15,
    riskScore: 'high',
    followers: 4521,
    isVerified: true,
    joinedAt: '2022-11-28',
    trades: 2134,
  },
  {
    id: '6',
    address: '0x1u2v...3w4x',
    username: 'ConservativeTrader',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=conservative',
    roi: { daily: 0.5, weekly: 2.8, monthly: 11.2, allTime: 67.3 },
    winRate: 68.9,
    totalVolume: 456000,
    activePositions: 3,
    riskScore: 'low',
    followers: 234,
    isVerified: false,
    joinedAt: '2024-01-15',
    trades: 89,
  },
  {
    id: '7',
    address: '0x5y6z...7a8b',
    username: 'BullishBets',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=bullish',
    roi: { daily: 6.8, weekly: 28.4, monthly: 95.2, allTime: 678.4 },
    winRate: 79.6,
    totalVolume: 9120000,
    activePositions: 18,
    riskScore: 'high',
    followers: 5678,
    isVerified: true,
    joinedAt: '2022-08-05',
    trades: 3421,
  },
  {
    id: '8',
    address: '0x9c0d...1e2f',
    username: 'NewsTrader',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=news',
    roi: { daily: 2.1, weekly: 9.7, monthly: 35.8, allTime: 198.7 },
    winRate: 73.4,
    totalVolume: 1890000,
    activePositions: 7,
    riskScore: 'medium',
    followers: 892,
    isVerified: true,
    joinedAt: '2023-07-20',
    trades: 567,
  },
];

export const mockPositions: Position[] = [
  {
    id: 'p1',
    market: 'Will Bitcoin reach $100k by Dec 2024?',
    outcome: 'Yes',
    type: 'long',
    entryPrice: 0.45,
    currentPrice: 0.62,
    size: 5000,
    pnl: 1888.89,
    pnlPercent: 37.78,
    openedAt: '2024-10-15T10:30:00Z',
  },
  {
    id: 'p2',
    market: 'US Presidential Election 2024 Winner',
    outcome: 'Trump',
    type: 'long',
    entryPrice: 0.52,
    currentPrice: 0.58,
    size: 10000,
    pnl: 1153.85,
    pnlPercent: 11.54,
    openedAt: '2024-09-20T14:15:00Z',
  },
  {
    id: 'p3',
    market: 'Fed Rate Cut in November?',
    outcome: 'Yes',
    type: 'long',
    entryPrice: 0.78,
    currentPrice: 0.72,
    size: 3000,
    pnl: -230.77,
    pnlPercent: -7.69,
    openedAt: '2024-10-28T09:00:00Z',
  },
  {
    id: 'p4',
    market: 'ETH above $3k by EOY?',
    outcome: 'Yes',
    type: 'long',
    entryPrice: 0.35,
    currentPrice: 0.48,
    size: 8000,
    pnl: 2971.43,
    pnlPercent: 37.14,
    openedAt: '2024-10-01T16:45:00Z',
  },
];

export const mockTrades: Trade[] = [
  {
    id: 't1',
    traderId: '2',
    traderName: 'PredictionKing',
    market: 'Bitcoin $100k by Dec 2024',
    outcome: 'Yes',
    type: 'buy',
    price: 0.62,
    size: 2500,
    timestamp: '2024-10-30T14:23:00Z',
    status: 'executed',
  },
  {
    id: 't2',
    traderId: '5',
    traderName: 'MarketMaven',
    market: 'US Election - Trump',
    outcome: 'Yes',
    type: 'buy',
    price: 0.58,
    size: 5000,
    timestamp: '2024-10-30T13:45:00Z',
    status: 'executed',
  },
  {
    id: 't3',
    traderId: '1',
    traderName: 'CryptoWhale',
    market: 'Fed Rate Cut Nov',
    outcome: 'No',
    type: 'sell',
    price: 0.28,
    size: 1500,
    pnl: 420,
    timestamp: '2024-10-30T12:30:00Z',
    status: 'executed',
  },
  {
    id: 't4',
    traderId: '7',
    traderName: 'BullishBets',
    market: 'ETH $3k EOY',
    outcome: 'Yes',
    type: 'buy',
    price: 0.48,
    size: 3500,
    timestamp: '2024-10-30T11:15:00Z',
    status: 'executed',
  },
  {
    id: 't5',
    traderId: '2',
    traderName: 'PredictionKing',
    market: 'NVIDIA beats earnings',
    outcome: 'Yes',
    type: 'buy',
    price: 0.71,
    size: 4000,
    timestamp: '2024-10-30T10:00:00Z',
    status: 'executed',
  },
];

export const mockCopySubscriptions: CopySubscription[] = [
  {
    id: 'cs1',
    traderId: '2',
    traderName: 'PredictionKing',
    traderAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=king',
    allocation: 5000,
    maxTradeSize: 1000,
    riskMultiplier: 1.5,
    maxOpenPositions: 5,
    stopLoss: 20,
    status: 'active',
    totalPnl: 1247.50,
    startedAt: '2024-09-15T00:00:00Z',
  },
  {
    id: 'cs2',
    traderId: '5',
    traderName: 'MarketMaven',
    traderAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=maven',
    allocation: 3000,
    maxTradeSize: 500,
    riskMultiplier: 1.0,
    maxOpenPositions: 3,
    stopLoss: 15,
    status: 'active',
    totalPnl: 892.30,
    startedAt: '2024-10-01T00:00:00Z',
  },
  {
    id: 'cs3',
    traderId: '1',
    traderName: 'CryptoWhale',
    traderAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=whale',
    allocation: 2000,
    maxTradeSize: 400,
    riskMultiplier: 0.5,
    maxOpenPositions: 4,
    stopLoss: 10,
    status: 'paused',
    totalPnl: 156.80,
    startedAt: '2024-10-20T00:00:00Z',
  },
];

export const performanceData = [
  { date: 'Oct 1', pnl: 0, cumulative: 0 },
  { date: 'Oct 5', pnl: 250, cumulative: 250 },
  { date: 'Oct 10', pnl: 180, cumulative: 430 },
  { date: 'Oct 15', pnl: -120, cumulative: 310 },
  { date: 'Oct 20', pnl: 450, cumulative: 760 },
  { date: 'Oct 25', pnl: 320, cumulative: 1080 },
  { date: 'Oct 30', pnl: 580, cumulative: 1660 },
];

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatPercent = (value: number): string => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

export const shortenAddress = (address: string): string => {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};
