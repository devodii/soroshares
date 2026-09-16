/**
 * Extracts a human-readable message from a thrown value of unknown shape.
 * Not everything we catch is an `Error` — the Stellar Wallets Kit, for one,
 * rejects with a plain `{code, message}` object, which `String(err)` turns
 * into the useless "[object Object]".
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
    return err.message;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
