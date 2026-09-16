function requirePublic(name: string, value: string | undefined): string {
  if (!value) throw new Error(`missing required env var ${name}`);
  return value;
}

// Unlike requirePublic, doesn't throw: these are unset until bootstrap runs once.
function optionalPublic(value: string | undefined): string {
  return value ?? "";
}

export const NETWORK_PASSPHRASE = requirePublic(
  "NEXT_PUBLIC_NETWORK_PASSPHRASE",
  process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE,
);
export const HORIZON_URL = requirePublic(
  "NEXT_PUBLIC_HORIZON_URL",
  process.env.NEXT_PUBLIC_HORIZON_URL,
);
export const RPC_URL = requirePublic("NEXT_PUBLIC_RPC_URL", process.env.NEXT_PUBLIC_RPC_URL);
export const HOME_DOMAIN = requirePublic(
  "NEXT_PUBLIC_HOME_DOMAIN",
  process.env.NEXT_PUBLIC_HOME_DOMAIN,
);
export const DPRI_ISSUER = optionalPublic(process.env.NEXT_PUBLIC_DPRI_ISSUER);
export const DPRI_SAC = optionalPublic(process.env.NEXT_PUBLIC_DPRI_SAC);
export const USDC_ISSUER = optionalPublic(process.env.NEXT_PUBLIC_USDC_ISSUER);
export const USDC_SAC = optionalPublic(process.env.NEXT_PUBLIC_USDC_SAC);
export const OFFER_CONTRACT = optionalPublic(process.env.NEXT_PUBLIC_OFFER_CONTRACT);
export const ADMIN_PUBLIC = optionalPublic(process.env.NEXT_PUBLIC_ADMIN_PUBLIC);
export const DEMO_CLOSE_LEDGER = Number(process.env.NEXT_PUBLIC_DEMO_CLOSE_LEDGER || 0);
export const PRICE_NGN = Number(
  requirePublic("NEXT_PUBLIC_PRICE_NGN", process.env.NEXT_PUBLIC_PRICE_NGN),
);
export const PRICE_USDC = Number(
  requirePublic("NEXT_PUBLIC_PRICE_USDC", process.env.NEXT_PUBLIC_PRICE_USDC),
);
export const MIN_SHARES = Number(
  requirePublic("NEXT_PUBLIC_MIN_SHARES", process.env.NEXT_PUBLIC_MIN_SHARES),
);
export const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || undefined;

function requireServer(name: string, value: string | undefined): string {
  if (!value) throw new Error(`missing required server env var ${name}`);
  return value;
}

export function issuerSecret(): string {
  return requireServer("ISSUER_SECRET", process.env.ISSUER_SECRET);
}

export function adminSecret(): string {
  return requireServer("ADMIN_SECRET", process.env.ADMIN_SECRET);
}

export function mockUsdcIssuerSecret(): string {
  return requireServer("MOCK_USDC_ISSUER_SECRET", process.env.MOCK_USDC_ISSUER_SECRET);
}

export const USE_MOCK_USDC = process.env.USE_MOCK_USDC === "true";

export function serverSigningSecret(): string {
  return requireServer("SERVER_SIGNING_SECRET", process.env.SERVER_SIGNING_SECRET);
}

export function jwtSecret(): string {
  return requireServer("JWT_SECRET", process.env.JWT_SECRET);
}

export function adminUiPassword(): string {
  return requireServer("ADMIN_UI_PASSWORD", process.env.ADMIN_UI_PASSWORD);
}
