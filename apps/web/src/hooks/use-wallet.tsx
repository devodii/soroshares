"use client";

import * as React from "react";
import * as wallet from "@/lib/wallet";

interface WalletContextValue {
  address: string | null;
  connecting: boolean;
  token: string | null;
  signingIn: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signIn: () => Promise<void>;
  signTransaction: (xdr: string) => Promise<string>;
  signAuthEntry: (entryXdr: string) => Promise<string>;
}

const WalletContext = React.createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = React.useState<string | null>(null);
  const [connecting, setConnecting] = React.useState(false);
  const [token, setToken] = React.useState<string | null>(null);
  const [signingIn, setSigningIn] = React.useState(false);

  const connect = React.useCallback(async () => {
    setConnecting(true);
    try {
      const connected = await wallet.connect();
      setAddress(connected);
      setToken(null);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = React.useCallback(async () => {
    await wallet.disconnect();
    setAddress(null);
    setToken(null);
  }, []);

  const signIn = React.useCallback(async () => {
    if (!address) throw new Error("connect a wallet first");
    setSigningIn(true);
    try {
      const challengeRes = await fetch(`/api/auth?account=${address}`);
      if (!challengeRes.ok)
        throw new Error((await challengeRes.json()).error ?? "challenge failed");
      const { transaction } = await challengeRes.json();

      const signedXdr = await wallet.signTransaction(transaction, address);

      const verifyRes = await fetch("/api/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ transaction: signedXdr }),
      });
      if (!verifyRes.ok) throw new Error((await verifyRes.json()).error ?? "verification failed");
      const { token: issuedToken } = await verifyRes.json();
      setToken(issuedToken);
    } finally {
      setSigningIn(false);
    }
  }, [address]);

  const signTransaction = React.useCallback(
    async (xdr: string) => {
      if (!address) throw new Error("connect a wallet first");
      return wallet.signTransaction(xdr, address);
    },
    [address],
  );

  const signAuthEntry = React.useCallback(
    async (entryXdr: string) => {
      if (!address) throw new Error("connect a wallet first");
      return wallet.signAuthEntry(entryXdr, address);
    },
    [address],
  );

  return (
    <WalletContext.Provider
      value={{
        address,
        connecting,
        token,
        signingIn,
        connect,
        disconnect,
        signIn,
        signTransaction,
        signAuthEntry,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = React.useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within a WalletProvider");
  return ctx;
}
