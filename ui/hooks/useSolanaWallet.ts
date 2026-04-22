"use client";

import { useEffect, useState } from "react";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_NETWORK === "mainnet"
  ? "https://api.mainnet-beta.solana.com"
  : "https://api.devnet.solana.com";

export interface WalletState {
  connected: boolean;
  address: string | null;
  balance: number | null; // in SOL
  network: string;
  slot: number | null;
}

export function useSolanaWallet(): WalletState & { connect: () => Promise<void>; disconnect: () => void } {
  const [state, setState] = useState<WalletState>({
    connected: false,
    address: null,
    balance: null,
    network: process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet",
    slot: null,
  });

  useEffect(() => {
    const connection = new Connection(RPC_URL, "confirmed");
    let interval: NodeJS.Timeout;

    const fetchSlot = async () => {
      try {
        const slot = await connection.getSlot();
        setState((s) => ({ ...s, slot }));
      } catch {}
    };

    fetchSlot();
    interval = setInterval(fetchSlot, 5000);
    return () => clearInterval(interval);
  }, []);

  const connect = async () => {
    // In production: integrate @solana/wallet-adapter
    // For MVP: use phantom window injection
    const phantom = (window as any)?.phantom?.solana ?? (window as any)?.solana;
    if (!phantom) {
      alert("Phantom wallet not found. Please install phantom.app");
      return;
    }

    try {
      const { publicKey } = await phantom.connect();
      const connection = new Connection(RPC_URL, "confirmed");
      const lamports = await connection.getBalance(new PublicKey(publicKey.toString()));

      setState((s) => ({
        ...s,
        connected: true,
        address: publicKey.toString(),
        balance: lamports / LAMPORTS_PER_SOL,
      }));
    } catch (err: any) {
      console.error("[Wallet] Connect error:", err.message);
    }
  };

  const disconnect = () => {
    const phantom = (window as any)?.phantom?.solana ?? (window as any)?.solana;
    phantom?.disconnect?.();
    setState((s) => ({ ...s, connected: false, address: null, balance: null }));
  };

  return { ...state, connect, disconnect };
}
