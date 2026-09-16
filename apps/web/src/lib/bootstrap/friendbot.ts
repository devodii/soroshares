import { NotFoundError } from "@stellar/stellar-sdk";
import { horizonServer } from "@/lib/stellar";

const FRIENDBOT_URL = "https://friendbot.stellar.org";

export async function ensureFunded(publicKey: string): Promise<void> {
  const exists = await horizonServer
    .loadAccount(publicKey)
    .then(() => true)
    .catch((err) => {
      if (err instanceof NotFoundError) return false;
      throw err;
    });
  if (exists) return;

  const res = await fetch(`${FRIENDBOT_URL}?addr=${publicKey}`);
  if (!res.ok) {
    throw new Error(`friendbot funding failed for ${publicKey}: ${await res.text()}`);
  }
}
