const SECONDS_PER_LEDGER = 5;

export function formatLedgerCountdown(ledgersRemaining: number): string {
  if (ledgersRemaining <= 0) return "now";

  let seconds = ledgersRemaining * SECONDS_PER_LEDGER;
  const days = Math.floor(seconds / 86_400);
  seconds -= days * 86_400;
  const hours = Math.floor(seconds / 3_600);
  seconds -= hours * 3_600;
  const minutes = Math.floor(seconds / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
