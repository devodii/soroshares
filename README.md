# soroshares

Compliant IPO subscription on Stellar. KYC gate on the base layer, escrow + allotment + refund in one Soroban contract, subscribe from any Stellar wallet.

Reference implementation modeled on the Dangote Petroleum Refinery IPO terms (₦525/share, min 10 shares, offer window 14 Sep to 13 Oct 2026). **Testnet only. Not affiliated with Dangote, NGX, SEC Nigeria, GetEquity or NectarFi. No real money, ever.**

## What it enforces, and where

| Offer term (DPRI prospectus)            | Where it is enforced                         | Primitive                            |
| --------------------------------------- | -------------------------------------------- | ------------------------------------ |
| Only verified investors can hold shares | Ledger rejects unauthorized trustlines       | AUTH_REQUIRED + set_trust_line_flags |
| Identity verification (BVN)             | SEP-12 KYC server → issuer authorization     | SEP-10, SEP-12                       |
| ₦525 / share, min 10                    | Contract `subscribe` checks                  | `public_offer` contract              |
| Offer closes 13 Oct                     | `close_ledger`                               | Soroban ledger sequence              |
| "Subscription is not allotment"         | `finalize(allotment_bps)` + `claim` pro-rata | `public_offer` contract              |
| Refund of unallotted money              | `claim` refunds the difference               | SAC transfer                         |
| Failed / abandoned offer                | `refund` after grace, permissionless         | `public_offer` contract              |
| Regulator recall of shares              | Issuer clawback                              | CLAWBACK_ENABLED                     |
| Subscribe from any wallet               | stellar.toml discovery + Stellar Wallets Kit | SEP-1                                |
| Naira funding (not in demo)             | Hosted deposit from an NGN anchor            | SEP-24 / SEP-38                      |

## Repo layout

```
contracts/public_offer/   Soroban contract (Rust) — subscribe, finalize, claim, refund
scripts/                  reproducible testnet setup (accounts, asset issuance, deploy, bindings)
apps/contract-client/     generated TypeScript bindings for the contract
apps/web/                 Next.js demo: the subscription flow + /admin
```

## How to run

Requires: Rust + the `stellar` CLI, Node 20+, pnpm.

```bash
pnpm install

# 1. build + test the contract
cd contracts/public_offer && cargo test && cd ../..

# 2. bootstrap testnet: accounts, DPRI issuance, contract deploy, share funding
pnpm --dir scripts setup-accounts
pnpm --dir scripts issue-dpri
pnpm --dir scripts deploy-contract
pnpm --dir scripts fund-contract-shares
pnpm --dir scripts bindings

# 3. print the filled-in env block and paste it into apps/web/.env.local
pnpm --dir scripts print-env

# 4. run the app
pnpm --dir apps/web dev
```

Redeploying for a fresh demo run (a closed offer can't reopen): clear `offerContract` from `scripts/.keys.json`, then rerun `deploy-contract`, `fund-contract-shares`, and `print-env`.

`/admin` is gated by `ADMIN_UI_PASSWORD` (printed by `print-env`); the connected wallet must match `NEXT_PUBLIC_ADMIN_PUBLIC` to finalize or withdraw.

### USDC

Defaults to Circle's real testnet USDC issuer. Testnet USDC comes from [faucet.circle.com](https://faucet.circle.com) (captcha-gated, 20 USDC / 2h per address — no API, so it isn't scripted here). Set `USE_MOCK_USDC=true` before running `issue-dpri` to issue a mock USDC asset from a throwaway issuer instead.

## What a production version needs

A licensed receiving agent standing in as issuer (not a throwaway testnet keypair), a real SEP-24 NGN anchor for funding instead of a fixed demo rate, a real KYC/BVN provider behind SEP-12 instead of the pattern-matched demo approval, nominee/CSCS reconciliation for the off-chain share register, and an audit of the contract before it holds real funds.

## License

MIT
