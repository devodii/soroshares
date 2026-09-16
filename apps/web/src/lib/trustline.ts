import { Asset, Horizon } from "@stellar/stellar-sdk";

type Balance = Horizon.HorizonApi.BalanceLine;
type AssetBalance = Extract<Balance, { asset_code: string; asset_issuer: string }>;

export function findTrustline(balances: Balance[], asset: Asset): AssetBalance | undefined {
  return balances.find(
    (b): b is AssetBalance =>
      "asset_code" in b && b.asset_code === asset.getCode() && b.asset_issuer === asset.getIssuer(),
  );
}
