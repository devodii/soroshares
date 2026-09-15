import { FRIENDBOT_URL } from "./config.js";

export async function fund(publicKey: string): Promise<void> {
  const res = await fetch(`${FRIENDBOT_URL}?addr=${publicKey}`);
  if (!res.ok) {
    throw new Error(`friendbot funding failed for ${publicKey}: ${await res.text()}`);
  }
}
