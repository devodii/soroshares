"use client";

import * as React from "react";
import { useCookieState } from "@/hooks/use-cookie-state";
import { apiFetch } from "@/lib/api-client";
import * as wallet from "@/lib/wallet";

interface WalletContextValue {
  address: string | null;
  connecting: boolean;
  restoring: boolean;
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
  const [address, setAddress] = useCookieState<string | null>("sh_address", null);
  const [walletId, setWalletId] = useCookieState<string | null>("sh_wallet_id", null);
  const [token, setToken] = useCookieState<string | null>("sh_token", null, {
    expires: 1,
    path: "/",
  });
  const [connecting, setConnecting] = React.useState(false);
  const [restoring, setRestoring] = React.useState(false);
  const [signingIn, setSigningIn] = React.useState(false);
  const restoreAttempted = React.useRef(false);

  React.useEffect(() => {
    if (restoreAttempted.current || !walletId) return;
    restoreAttempted.current = true;
    setRestoring(true);
    wallet
      .restore(walletId)
      .then((restoredAddress) => {
        if (!restoredAddress) {
          setAddress(null);
          setWalletId(null);
          setToken(null);
        }
      })
      .finally(() => setRestoring(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletId]);

  const connect = React.useCallback(async () => {
    setConnecting(true);
    try {
      const connected = await wallet.connect();
      setAddress(connected.address);
      setWalletId(connected.walletId);
      setToken(null);
    } finally {
      setConnecting(false);
    }
  }, [setAddress, setToken, setWalletId]);

  const disconnect = React.useCallback(async () => {
    await wallet.disconnect();
    setAddress(null);
    setWalletId(null);
    setToken(null);
  }, [setAddress, setToken, setWalletId]);

  const signIn = React.useCallback(async () => {
    if (!address) throw new Error("connect a wallet first");
    setSigningIn(true);
    try {
      const { transaction } = await apiFetch<{ transaction: string }>(
        `/api/auth?account=${address}`,
      );
      const signedXdr = await wallet.signTransaction(transaction, address);
      const { token: issuedToken } = await apiFetch<{ token: string }>("/api/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ transaction: signedXdr }),
      });
      setToken(issuedToken);
    } finally {
      setSigningIn(false);
    }
  }, [address, setToken]);

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
        restoring,
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
