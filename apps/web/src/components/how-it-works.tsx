import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MECHANISM_STEPS = [
  {
    value: "connect",
    title: "1. Connect a wallet",
    body: "Connect Freighter, xBull, Albedo, or another supported wallet via the Stellar Wallets Kit.",
  },
  {
    value: "trustline",
    title: "2. Add a trustline",
    body: "Open a trustline to DPRI, the classic Stellar asset that represents the shares.",
  },
  {
    value: "identity",
    title: "3. Prove identity",
    body: "Sign a challenge (SEP-10) to authenticate, then submit KYC info (SEP-12). A rules engine (valid 11-digit BVN, age 18+) auto-approves or rejects.",
  },
  {
    value: "authorize",
    title: "4. Issuer authorizes your trustline",
    body: "On approval, the issuer authorizes your trustline on-chain. Until this happens, the ledger itself refuses to let you hold DPRI — this is the compliance gate, not a database flag.",
  },
  {
    value: "subscribe",
    title: "5. Subscribe",
    body: "Enter a number of shares and press-and-hold to confirm. Your wallet signs a call into the public_offer contract, and USDC moves from you into the contract.",
  },
  {
    value: "close",
    title: "6. Wait for close, then finalize",
    body: 'After the offer\'s close ledger passes, the admin calls finalize(allotment_bps) — e.g. "60% allotted" — exactly like a real oversubscribed IPO.',
  },
  {
    value: "claim",
    title: "7. Claim",
    body: "You (or anyone, on your behalf) call claim. The contract sends your allotted DPRI and refunds the USDC for the unallotted portion. If the admin never finalizes, refund opens after a grace period and anyone can pull their full deposit back.",
  },
];

export function HowItWorks() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>How it works</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion defaultValue={["connect"]}>
          {MECHANISM_STEPS.map((step) => (
            <AccordionItem key={step.value} value={step.value}>
              <AccordionTrigger>{step.title}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{step.body}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
