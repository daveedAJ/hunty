import Server from "@stellar/stellar-sdk";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SorobanServer = Server as any;

/**
 * Default RPC URL for Soroban (Futurenet).
 * Can be overridden by NEXT_PUBLIC_SOROBAN_RPC_URL in .env.local.
 */
export const DEFAULT_RPC_URL = "https://rpc.futurenet.stellar.org";

/**
 * Default network passphrase for Futurenet.
 * Can be overridden by NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE in .env.local.
 */
export const DEFAULT_NETWORK_PASSPHRASE = "Test SDF Future Network ; October 2022";

export const MAINNET_NETWORK_PASSPHRASE = "Public Global Stellar Network ; September 2015";

/**
 * Retrieves the RPC URL from environment or uses the default.
 */
function getRpcUrl(): string {
  return process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? DEFAULT_RPC_URL;
}

/**
 * Retrieves the network passphrase from environment or uses the default.
 */
function getNetworkPassphrase(): string {
  return process.env.NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE ?? DEFAULT_NETWORK_PASSPHRASE;
}

/**
 * Creates a Soroban Server instance for the configured RPC URL.
 * Uses the same Server API as soroban-client (stellar-sdk is the maintained package).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createSorobanServer(): any {
  return new SorobanServer(getRpcUrl());
}

/**
 * Returns the configured network passphrase (Futurenet/Testnet).
 */
export function getSorobanNetworkPassphrase(): string {
  return getNetworkPassphrase();
}

/**
 * Returns the configured RPC URL.
 */
export function getSorobanRpcUrl(): string {
  return getRpcUrl();
}
