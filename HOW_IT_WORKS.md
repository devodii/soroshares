# How soroshares works

## The problem

When a company goes public in Nigeria, everyone can subscribe for shares, but there usually isn't enough supply for everyone who wants in. Dangote Petroleum Refinery's IPO priced shares at ₦525 each with a 10-share minimum, and like almost every real IPO, demand outran supply.

When that happens, nobody gets everything they paid for. You get **allotted** a percentage of what you subscribed for, and refunded the rest. This is normal and expected in real markets — but it's usually a black box to the person subscribing. You send money, wait, and eventually find out what you actually got, with no way to verify any of it yourself.

## The idea

What if the entire subscribe → allot → claim → refund process ran as code, on a public ledger, where anyone could read the exact rules and verify their own outcome?

That's soroshares: a real Soroban smart contract on Stellar testnet that enforces this mechanic on-chain. Not a mockup of an IPO flow — an actual contract holding escrowed funds, computing allotments, and releasing shares and refunds, all inspectable by anyone.

It's modeled on the real Dangote Petroleum Refinery IPO terms as a reference point, but it isn't affiliated with Dangote, NGX, SEC Nigeria, or any real entity, and it only runs on Stellar testnet — no real money is ever involved.

## The one idea that explains everything: subscription ≠ allotment

Paying into the offer does not give you shares. It gives you a claim on shares, resolved later, once total demand is known.

1. **Subscribe** — you send USDC into the contract. It just records "this address subscribed for N shares." No shares move yet. Your money sits in escrow.
2. **Close** — the offer stops accepting new subscriptions at a fixed point (a ledger number, not a date — more on that below).
3. **Finalize** — the issuer looks at total demand vs. available shares and sets one allotment percentage that applies to everyone equally.
4. **Claim** — each subscriber calls this themselves, whenever they want. Nobody has to wait for anyone else, and no admin "distributes" anything — the contract computes your share of the allotment and sends it, on the spot.

## The math, worked through

Say the offer has 1,000,000 DPRI shares at ₦525/share (≈0.39 USDC/share on testnet).

- You subscribe for 100 shares → 39 USDC leaves your wallet into the contract's escrow.
- The offer closes. Total demand across everyone turns out to be 3x the available supply.
- The issuer finalizes at a 33.33% allotment.
- You call claim:
  - `allotted = 100 × 0.3333 = 33 shares` (rounded down to a whole share)
  - You receive 33 DPRI
  - You're refunded `(100 - 33) × 0.39 ≈ 26.13 USDC` for the shares you didn't get

Same transaction, same call. No separate refund request, no waiting on anyone.

## What if the issuer never finalizes?

This is the part most demos skip. If the issuer disappears, drags their feet, or the offer fails for any reason, subscriber funds shouldn't be able to get stuck forever. After the close ledger plus a grace period elapses, any subscriber can call a separate, permissionless `refund()` and get their entire subscription back — no allotment, no shares, no issuer involvement required.

## Why a ledger number instead of a date

The offer's close time and grace period are both expressed as Stellar ledger sequence numbers, not calendar dates. Ledgers close roughly every 5 seconds, so a ledger number is a deterministic point in the chain's own history — it can't be delayed or manipulated the way a wall-clock deadline checked by off-chain code could be.

## What's actually enforced on-chain vs. what's just app UX

| Real, enforced by the protocol | Demo-only, for testing |
| --- | --- |
| Trustline gating — you can't hold DPRI without an authorized trustline, full stop | The "BVN" (identity number) check — any 11 digits pass, there's no real verification service |
| Escrow — subscribed USDC sits in the contract, not the issuer's wallet, until claim/refund | Mock USDC by default, funded by an in-app faucet, to sidestep testnet USDC issuer fragmentation |
| The allotment math itself — anyone can read the contract and verify their own claim | KYC storage — just a database record, carries no authority over money or shares |
| The grace-period refund failsafe — works even if the issuer vanishes | |
| Proceeds vs. refund pools kept separate — the issuer can only withdraw money for shares actually allotted | |

## The Stellar/Soroban pieces, and why each exists

- **Trustlines + issuer authorization** — the base-layer mechanism for "only verified accounts can hold this asset," enforced by the ledger itself, not application code that could be bypassed.
- **SEP-1 (`stellar.toml`)** — how any wallet discovers how to talk to this specific offer, without a custom integration.
- **SEP-10** — proves you control a wallet address by signing a challenge, without ever exposing a private key.
- **Stellar Asset Contracts (SAC)** — wrap the classic DPRI and USDC assets so the Soroban contract can move them; Soroban contracts can't touch classic-ledger balances directly otherwise.
- **Contract events** — every subscribe/finalize/claim/refund emits an event, which is how the on-chain activity feed works with no separate database or indexer.
- **Clawback-enabled issuance** — the one nod to real-world compliance: the capability for a regulator to recall shares, present but unused in the demo flow.

## Why this exists

The goal isn't "here's an IPO demo." It's: **building real financial mechanisms on Stellar shouldn't require reverse-engineering a dozen SEPs and Soroban's storage model from scratch.** soroshares is meant to be a concrete, working reference — read the contract, read the app, see exactly how the pieces fit, and reuse whatever's useful. Making that easy is the actual point.
