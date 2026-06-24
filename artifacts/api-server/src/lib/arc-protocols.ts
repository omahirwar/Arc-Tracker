export type ProtocolCategory =
  | "swap"
  | "bridge"
  | "liquidity"
  | "staking"
  | "nft"
  | "other";

export type ArcProtocol = {
  id: string;
  name: string;
  category: ProtocolCategory;
  contracts: `0x${string}`[];
  website?: string;
  explorerUrl?: string;
};

/**
 * Verified Arc ecosystem protocol contracts.
 * Add real, verified contract addresses here as the Arc ecosystem grows.
 *
 * To add a protocol:
 * 1. Verify the contract address on the Arc explorer
 * 2. Add an entry with the correct category and contracts array
 * 3. Optionally include a website URL
 *
 * Example:
 * {
 *   id: "arc-dex",
 *   name: "Arc DEX",
 *   category: "swap",
 *   contracts: ["0xYourContractAddressHere"],
 *   website: "https://example.com",
 * }
 */
export const ARC_PROTOCOLS: ArcProtocol[] = [
  // Add only verified real Arc ecosystem protocol contracts here.
  // Do not add placeholders.
  // The registry is currently empty — projectsFound and totalTrackedProjects will be 0.
];
