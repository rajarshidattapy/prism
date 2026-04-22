-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address TEXT UNIQUE,
  username TEXT,
  email TEXT,
  avatar_url TEXT,
  telegram_chat_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create traders table for leaderboard
CREATE TABLE public.traders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  address TEXT NOT NULL UNIQUE,
  username TEXT,
  avatar_url TEXT,
  roi_daily DECIMAL(10, 4) DEFAULT 0,
  roi_weekly DECIMAL(10, 4) DEFAULT 0,
  roi_monthly DECIMAL(10, 4) DEFAULT 0,
  roi_all_time DECIMAL(10, 4) DEFAULT 0,
  win_rate DECIMAL(5, 2) DEFAULT 0,
  total_volume DECIMAL(18, 2) DEFAULT 0,
  active_positions INTEGER DEFAULT 0,
  total_trades INTEGER DEFAULT 0,
  risk_score TEXT DEFAULT 'medium' CHECK (risk_score IN ('low', 'medium', 'high')),
  followers_count INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create copy_subscriptions table for tracking who users are copying
CREATE TABLE public.copy_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trader_id UUID NOT NULL REFERENCES public.traders(id) ON DELETE CASCADE,
  allocation DECIMAL(18, 2) NOT NULL DEFAULT 100,
  max_trade_size DECIMAL(18, 2) NOT NULL DEFAULT 50,
  risk_multiplier DECIMAL(4, 2) NOT NULL DEFAULT 1.0,
  max_open_positions INTEGER NOT NULL DEFAULT 5,
  stop_loss DECIMAL(5, 2) NOT NULL DEFAULT 20,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'stopped')),
  total_pnl DECIMAL(18, 2) DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, trader_id)
);

-- Create positions table for tracking open positions
CREATE TABLE public.positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.copy_subscriptions(id) ON DELETE SET NULL,
  trader_id UUID REFERENCES public.traders(id) ON DELETE SET NULL,
  market_id TEXT NOT NULL,
  market_title TEXT NOT NULL,
  outcome TEXT NOT NULL,
  position_type TEXT NOT NULL CHECK (position_type IN ('long', 'short')),
  entry_price DECIMAL(10, 4) NOT NULL,
  current_price DECIMAL(10, 4),
  size DECIMAL(18, 2) NOT NULL,
  pnl DECIMAL(18, 2) DEFAULT 0,
  pnl_percent DECIMAL(10, 4) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE
);

-- Create trades table for trade history
CREATE TABLE public.trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES public.copy_subscriptions(id) ON DELETE SET NULL,
  trader_id UUID REFERENCES public.traders(id) ON DELETE SET NULL,
  position_id UUID REFERENCES public.positions(id) ON DELETE SET NULL,
  market_id TEXT NOT NULL,
  market_title TEXT NOT NULL,
  outcome TEXT NOT NULL,
  trade_type TEXT NOT NULL CHECK (trade_type IN ('buy', 'sell')),
  price DECIMAL(10, 4) NOT NULL,
  size DECIMAL(18, 2) NOT NULL,
  pnl DECIMAL(18, 2),
  status TEXT NOT NULL DEFAULT 'executed' CHECK (status IN ('pending', 'executed', 'failed', 'cancelled')),
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copy_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Traders policies (public read, authenticated update for admin)
CREATE POLICY "Anyone can view traders"
ON public.traders FOR SELECT
TO authenticated
USING (true);

-- Copy subscriptions policies
CREATE POLICY "Users can view their own subscriptions"
ON public.copy_subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscriptions"
ON public.copy_subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions"
ON public.copy_subscriptions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions"
ON public.copy_subscriptions FOR DELETE
USING (auth.uid() = user_id);

-- Positions policies
CREATE POLICY "Users can view their own positions"
ON public.positions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own positions"
ON public.positions FOR ALL
USING (auth.uid() = user_id);

-- Trades policies
CREATE POLICY "Users can view their own trades"
ON public.trades FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trades"
ON public.trades FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, wallet_address)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'wallet_address'
  );
  RETURN new;
END;
$$;

-- Create trigger for auto profile creation
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_copy_subscriptions_updated_at
BEFORE UPDATE ON public.copy_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for positions and trades
ALTER PUBLICATION supabase_realtime ADD TABLE public.positions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trades;