## The problem

When more people subscribe for shares than there are shares available, not everyone gets what they paid for. This happens in nearly every real IPO. Nobody knows their actual allotment in advance, and the process of calculating and returning the excess money is usually a black box run by a small group of people.

## The fix

soroshares enforces the entire subscribe, allot, claim and refund cycle as code on a public ledger. Two facts make this work:

1. Subscribing escrows your money. It does not give you shares yet.
2. Shares are only handed out after the issuer sets one allotment percentage for everyone, applied by a public formula anyone can verify.

## The math

If you subscribe for $s$ shares and the issuer sets an allotment of $p$ percent, your actual allotment is:

$$
\text{allotted} = \left\lfloor s \times \frac{p}{100} \right\rfloor
$$

You are refunded for the difference:

$$
\text{refund} = (s - \text{allotted}) \times \text{price}
$$

### A worked example

Say the price is 0.39 USDC per share and you subscribe for 100 shares.

- You pay $100 \times 0.39 = 39$ USDC into escrow.
- Demand across everyone ends up at 3x supply, so the issuer sets $p = 33.33$.
- Your allotment: $\lfloor 100 \times 0.3333 \rfloor = 33$ shares.
- Your refund: $(100 - 33) \times 0.39 = 26.13$ USDC.

You receive 33 DPRI and 26.13 USDC back, in one transaction, computed by the contract, not a person.

## If the issuer never finalizes

If the offer closes and the issuer never sets an allotment, a grace period elapses and anyone can trigger a full refund for any subscriber. No approval needed.
