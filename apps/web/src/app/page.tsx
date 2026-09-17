import { ActivityFeed } from "@/components/activity-feed";
import { BuiltBy } from "@/components/built-by";
import { OfferPanel } from "@/components/offer-panel";
import { ClaimStep } from "@/components/steps/claim";
import { ConnectWalletStep } from "@/components/steps/connect-wallet";
import { KycStep } from "@/components/steps/kyc";
import { SubscribeStep } from "@/components/steps/subscribe";
import { TrustlineStep } from "@/components/steps/trustline";
import { clientEnv } from "@/lib/env.client";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-10">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">DPRI public offer on Stellar (testnet)</h1>
        <p className="text-sm text-muted-foreground">
          Modeled on the Dangote Petroleum Refinery IPO terms. Testnet only. Not affiliated.
        </p>
      </header>

      <OfferPanel />

      <div className="space-y-4">
        <ConnectWalletStep />
        <TrustlineStep />
        <KycStep />
        <SubscribeStep />
        <ClaimStep />
      </div>

      <ActivityFeed />

      <BuiltBy />

      <footer className="flex flex-wrap gap-x-4 gap-y-1 border-t pt-4 text-xs text-muted-foreground">
        <a
          href="https://github.com/devodii/soroshares"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          GitHub
        </a>
        <a
          href={`https://stellar.expert/explorer/testnet/contract/${clientEnv.NEXT_PUBLIC_OFFER_CONTRACT}`}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          Contract
        </a>
        <a
          href={`https://stellar.expert/explorer/testnet/account/${clientEnv.NEXT_PUBLIC_DPRI_ISSUER}`}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          DPRI issuer
        </a>
        <a href="/.well-known/stellar.toml" className="underline underline-offset-2">
          stellar.toml
        </a>
      </footer>
    </main>
  );
}
