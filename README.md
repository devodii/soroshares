# soroshares

Compliant IPO subscription on Stellar. KYC gate on the base layer, escrow, allotment and refund in one Soroban contract, subscribe from any Stellar wallet.

Reference implementation modeled on the Dangote Petroleum Refinery IPO terms (₦525/share, min 10 shares, offer window 14 Sep to 13 Oct 2026). **Testnet only. Not affiliated with Dangote, NGX, SEC Nigeria, GetEquity or NectarFi. No real money, ever.**

## What it enforces, and where

| Offer term (DPRI prospectus)            | Where it is enforced                         | Primitive                            |
| --------------------------------------- | -------------------------------------------- | ------------------------------------ |
| Only verified investors can hold shares | Ledger rejects unauthorized trustlines       | AUTH_REQUIRED + set_trust_line_flags |
| Identity verification (BVN)             | SEP-12 KYC server, then issuer authorization | SEP-10, SEP-12                       |
| ₦525 / share, min 10                    | Contract `subscribe` checks                  | `public_offer` contract              |
| Offer closes 13 Oct                     | `close_ledger`                               | Soroban ledger sequence              |
| "Subscription is not allotment"         | `finalize(allotment_bps)` + `claim` pro-rata | `public_offer` contract              |
| Refund of unallotted money              | `claim` refunds the difference               | SAC transfer                         |
| Failed or abandoned offer               | `refund` after grace, permissionless         | `public_offer` contract              |
| Regulator recall of shares              | Issuer clawback                              | CLAWBACK_ENABLED                     |
| Subscribe from any wallet               | stellar.toml discovery + Stellar Wallets Kit | SEP-1                                |
| Naira funding (not in demo)             | Hosted deposit from an NGN anchor            | SEP-24 / SEP-38                      |

## Repo layout

```
contracts/public_offer/   Soroban contract (Rust): subscribe, finalize, claim, refund
scripts/                  legacy CLI setup (accounts, asset issuance, deploy, bindings)
apps/contract-client/     generated TypeScript bindings for the contract
apps/web/                 Next.js demo: the subscription flow, /admin
```

## How to run

Requires Node 20+ and pnpm. Rust and the `stellar` CLI are only needed if you're changing the contract; the compiled wasm is committed, so deploying doesn't need them.

```bash
pnpm install
pnpm --dir apps/web dev
```

Set `apps/web/.env.local` (see `.env.local.example`) with at minimum `ISSUER_SECRET`, `ADMIN_SECRET`, `SERVER_SIGNING_SECRET`, `JWT_SECRET`, `ADMIN_UI_PASSWORD`. Each is just a fresh Stellar keypair secret or random string; `GET /api/admin/new-secret` generates them, no CLI needed.

Log into `/admin` and press **Run bootstrap**. It funds the issuer and admin via Friendbot, issues DPRI, wraps DPRI and USDC into their Stellar Asset Contracts, deploys and initializes `public_offer`, and funds it with shares. Idempotent, safe to press again. Copy the returned addresses into the `NEXT_PUBLIC_*` values in `.env.local` and restart.

### Redeploying for a fresh demo run

An offer that has closed can't reopen. Press **Redeploy fresh offer** in `/admin`, or `POST /api/admin/bootstrap` with `{"redeploy": true}`, then update `.env.local` again.

`/admin` is gated by `ADMIN_UI_PASSWORD`. The connected wallet must match `NEXT_PUBLIC_ADMIN_PUBLIC` to finalize or withdraw.

### USDC

Defaults to mock USDC, issued by the app itself, with an in-app faucet ("Get test USDC" in the Subscribe step). Set `USE_MOCK_USDC=false` to use Circle's real testnet USDC instead, funded from faucet.circle.com.

## What a production version needs

A licensed receiving agent as issuer, a real SEP-24 NGN anchor for funding instead of a fixed demo rate, a real KYC/BVN provider behind SEP-12, nominee/CSCS reconciliation for the off-chain share register, and an audit of the contract before it holds real funds.

## License

MIT
