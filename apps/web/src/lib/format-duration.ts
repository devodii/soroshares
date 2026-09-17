export const SECONDS_PER_LEDGER = 5;

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

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatCountdownClock(msRemaining: number): string {
  const totalSeconds = Math.max(Math.floor(msRemaining / 1000), 0);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  const clock = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return days > 0 ? `${days}d ${clock}` : clock;
}
