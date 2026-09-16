import { Networks } from "@creit.tech/stellar-wallets-kit";
import { defaultModules } from "@creit.tech/stellar-wallets-kit/modules/utils";
import { WalletConnectModule } from "@creit.tech/stellar-wallets-kit/modules/wallet-connect";
import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit/sdk";
import { NETWORK_PASSPHRASE, WALLETCONNECT_PROJECT_ID } from "./env";

let initialized = false;

function ensureInitialized(selectedWalletId?: string): void {
  if (initialized) return;
  const modules = defaultModules();
  if (WALLETCONNECT_PROJECT_ID) {
    modules.push(
      new WalletConnectModule({
        projectId: WALLETCONNECT_PROJECT_ID,
        metadata: {
          name: "soroshares",
          description: "DPRI public offer on Stellar (testnet)",
          url: window.location.origin,
          icons: [],
        },
      }),
    );
  }
  StellarWalletsKit.init({
    modules,
    network: NETWORK_PASSPHRASE as Networks,
    selectedWalletId,
  });
  initialized = true;
}

export async function connect(): Promise<{ address: string; walletId: string }> {
  ensureInitialized();
  const { address } = await StellarWalletsKit.authModal();
  return { address, walletId: StellarWalletsKit.selectedModule.productId };
}

// No fetchAddress() here: some extensions (Lobstr) prompt on every call.
export function selectWallet(walletId: string): void {
  ensureInitialized(walletId);
  StellarWalletsKit.setWallet(walletId);
}

export async function disconnect(): Promise<void> {
  ensureInitialized();
  await StellarWalletsKit.disconnect();
}

export async function signTransaction(xdr: string, address: string): Promise<string> {
  ensureInitialized();
  const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdr, {
    networkPassphrase: NETWORK_PASSPHRASE,
    address,
  });
  return signedTxXdr;
}

export async function signAuthEntry(entryXdr: string, address: string): Promise<string> {
  ensureInitialized();
  const { signedAuthEntry } = await StellarWalletsKit.signAuthEntry(entryXdr, {
    networkPassphrase: NETWORK_PASSPHRASE,
    address,
  });
  return signedAuthEntry;
}
