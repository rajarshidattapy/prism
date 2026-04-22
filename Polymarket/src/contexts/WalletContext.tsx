import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { 
  ConnectionProvider, 
  WalletProvider as SolanaWalletProvider, 
  useWallet as useSolanaWallet,
  useConnection 
} from '@solana/wallet-adapter-react';
import { WalletModalProvider, useWalletModal } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import bs58 from 'bs58';

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

// Solana Devnet for testing
const SOLANA_NETWORK = 'devnet';
const SOLANA_RPC_URL = clusterApiUrl(SOLANA_NETWORK);

interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  user: User | null;
  session: Session | null;
  network: string;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<string | null>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Inner provider that uses the Solana wallet hooks
const WalletContextInner = ({ children }: { children: ReactNode }) => {
  const { publicKey, connected, connecting, disconnect: solanaDisconnect, signMessage: solanaSignMessage } = useSolanaWallet();
  const { setVisible } = useWalletModal();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const address = publicKey?.toBase58() || null;

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Authenticate with backend when wallet connects
  useEffect(() => {
    const authenticateWallet = async () => {
      if (connected && publicKey && !user && !isAuthenticating) {
        setIsAuthenticating(true);
        try {
          const walletAddress = publicKey.toBase58();
          
          // Get nonce for signing
          const { data: nonceData, error: nonceError } = await supabase.functions.invoke('wallet-auth', {
            body: { action: 'get_nonce' }
          });

          if (nonceError) throw nonceError;

          // Create message to sign
          const message = `Sign in to PolyCopy\n\nWallet: ${walletAddress}\nNonce: ${nonceData.nonce}`;
          const encodedMessage = new TextEncoder().encode(message);

          // Sign the message
          if (!solanaSignMessage) {
            throw new Error('Wallet does not support message signing');
          }
          
          const signatureBytes = await solanaSignMessage(encodedMessage);
          const signature = bs58.encode(signatureBytes);

          // Verify with backend
          const { data: authData, error: authError } = await supabase.functions.invoke('wallet-auth', {
            body: {
              action: 'verify',
              address: walletAddress,
              message,
              signature,
              nonce: nonceData.nonce,
            }
          });

          if (authError) throw authError;

          console.log('Solana wallet authenticated:', authData);

          // Set session in Supabase client
          if (authData?.session) {
            await supabase.auth.setSession({
              access_token: authData.session.access_token,
              refresh_token: authData.session.refresh_token,
            });
            setSession(authData.session);
            setUser(authData.user);
          }
        } catch (error) {
          console.error('Wallet authentication error:', error);
        } finally {
          setIsAuthenticating(false);
        }
      }
    };

    authenticateWallet();
  }, [connected, publicKey, user, isAuthenticating, solanaSignMessage]);

  const connect = useCallback(async () => {
    setVisible(true);
  }, [setVisible]);

  const disconnect = useCallback(async () => {
    await solanaDisconnect();
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, [solanaDisconnect]);

  const signMessage = useCallback(async (message: string): Promise<string | null> => {
    if (!solanaSignMessage) return null;
    
    try {
      const encodedMessage = new TextEncoder().encode(message);
      const signatureBytes = await solanaSignMessage(encodedMessage);
      return bs58.encode(signatureBytes);
    } catch (error) {
      console.error('Sign message error:', error);
      return null;
    }
  }, [solanaSignMessage]);

  return (
    <WalletContext.Provider
      value={{
        address,
        isConnected: connected,
        isConnecting: connecting || isAuthenticating,
        user,
        session,
        network: SOLANA_NETWORK,
        connect,
        disconnect,
        signMessage,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

// Main provider that wraps everything
export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={SOLANA_RPC_URL}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletContextInner>
            {children}
          </WalletContextInner>
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
