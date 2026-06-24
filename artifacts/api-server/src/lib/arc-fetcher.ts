import { createPublicClient, http, isAddress } from "viem";
import { logger } from "./logger";
import { ARC_PROTOCOLS } from "./arc-protocols";
import { calculateScore } from "./arc-score";

// ---------------------------------------------------------------------------
// Env helpers
// ---------------------------------------------------------------------------

function env(key: string): string | undefined {
  return process.env[key] ?? undefined;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TransactionRecord {
  hash: string;
  type: "Contract Interaction" | "Native Transfer" | "Token Transfer" | "NFT Transfer" | "Unknown";
  from: string;
  to: string | null;
  date: string;
  status: "success" | "failed" | "pending";
  blockNumber: string;
}

export interface ContractRecord {
  address: string;
  name: string | null;
  category: string | null;
  interactions: number;
  lastInteraction: string | null;
}

export interface ProtocolRecord {
  id: string;
  name: string;
  category: string;
  interactions: number;
  firstInteraction: string | null;
  lastInteraction: string | null;
  website: string | null;
}

export interface NftRecord {
  contractAddress: string;
  collectionName: string | null;
  tokenId: string | null;
  eventType: string;
  date: string;
  transactionHash: string;
}

export interface WeeklyActivity {
  week: string;
  count: number;
}

export interface WalletActivityResult {
  address: string;
  network: string;
  dataMode: "full" | "partial" | "unavailable";
  totalTransactions: number;
  activeDays: number;
  uniqueContracts: number;
  firstActivity: string | null;
  lastActivity: string | null;
  projectsFound: number;
  totalTrackedProjects: number;
  arcScore: number | null;
  scoreLabel: string | null;
  scoreBreakdown: unknown | null;
  scamReports: number | null;
  transactions: TransactionRecord[];
  contracts: ContractRecord[];
  protocols: ProtocolRecord[];
  nfts: NftRecord[];
  weeklyActivity: WeeklyActivity[];
  error: string | null;
}

// ---------------------------------------------------------------------------
// Blockscout v2 API types (ArcScan)
// ---------------------------------------------------------------------------

interface BscAddress {
  hash: string;
  is_contract?: boolean;
  name?: string | null;
}

interface BscTx {
  hash: string;
  from: BscAddress;
  to: BscAddress | null;
  timestamp: string;
  status: string;
  raw_input: string;
  block_number: number;
  type?: string;
  token_transfers?: BscTokenTransfer[];
}

interface BscToken {
  address: string;
  name: string | null;
  symbol: string | null;
  type: string;
}

interface BscTokenTransfer {
  transaction_hash: string;
  from: BscAddress;
  to: BscAddress;
  timestamp: string;
  token: BscToken;
  total?: { token_id?: string };
}

interface BscPage<T> {
  items: T[];
  next_page_params: Record<string, string> | null;
}

// ---------------------------------------------------------------------------
// Blockscout v2 paginated fetch — fetches ALL pages
// ---------------------------------------------------------------------------

async function blockscoutFetchAll<T>(
  baseUrl: string,
  path: string,
  maxItems = 1000
): Promise<T[]> {
  const results: T[] = [];
  let url: string | null = `${baseUrl}${path}`;

  while (url && results.length < maxItems) {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) {
      throw new Error(`ArcScan API HTTP ${res.status}: ${url}`);
    }
    const json = (await res.json()) as BscPage<T>;
    const items = json.items ?? [];
    results.push(...items);

    if (!json.next_page_params || Object.keys(json.next_page_params).length === 0) {
      break;
    }
    const params = new URLSearchParams(json.next_page_params);
    url = `${baseUrl}${path}?${params.toString()}`;
  }
  return results;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isoWeek(dateStr: string): string {
  const d = new Date(dateStr);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7
  );
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function classifyBscTx(tx: BscTx, address: string): TransactionRecord["type"] {
  const toAddr = tx.to?.hash?.toLowerCase() ?? "";
  const fromAddr = tx.from?.hash?.toLowerCase() ?? "";
  const addrLower = address.toLowerCase();

  // Check for NFT token transfers in the tx
  const nftTransfer = tx.token_transfers?.find(
    (t) => t.token.type === "ERC-721" || t.token.type === "ERC-1155"
  );
  if (nftTransfer) return "NFT Transfer";

  const tokenTransfer = tx.token_transfers?.find(
    (t) => t.token.type === "ERC-20"
  );
  if (tokenTransfer) return "Token Transfer";

  // Contract interaction: to is a contract and raw_input has data
  if (
    tx.to?.is_contract &&
    tx.raw_input &&
    tx.raw_input !== "0x" &&
    tx.raw_input.length > 2
  ) {
    return "Contract Interaction";
  }

  if (!toAddr || toAddr === fromAddr) return "Unknown";
  return "Native Transfer";
}

// ---------------------------------------------------------------------------
// RPC-only fallback (when no explorer API configured)
// ---------------------------------------------------------------------------

async function rpcFallback(
  rpcUrl: string,
  address: string
): Promise<{ txCount: number }> {
  const client = createPublicClient({
    transport: http(rpcUrl, { timeout: 15000 }),
  });
  const txCount = await client.getTransactionCount({
    address: address as `0x${string}`,
  });
  return { txCount };
}

// ---------------------------------------------------------------------------
// Empty result helper
// ---------------------------------------------------------------------------

function emptyResult(
  address: string,
  networkName: string,
  dataMode: WalletActivityResult["dataMode"],
  error: string | null
): WalletActivityResult {
  return {
    address,
    network: networkName,
    dataMode,
    totalTransactions: 0,
    activeDays: 0,
    uniqueContracts: 0,
    firstActivity: null,
    lastActivity: null,
    projectsFound: 0,
    totalTrackedProjects: ARC_PROTOCOLS.length,
    arcScore: null,
    scoreLabel: null,
    scoreBreakdown: null,
    scamReports: null,
    transactions: [],
    contracts: [],
    protocols: [],
    nfts: [],
    weeklyActivity: [],
    error,
  };
}

// ---------------------------------------------------------------------------
// Main fetcher
// ---------------------------------------------------------------------------

export async function fetchWalletActivity(
  address: string
): Promise<WalletActivityResult> {
  if (!isAddress(address)) {
    throw Object.assign(new Error("Please enter a valid EVM wallet address."), {
      code: "INVALID_ADDRESS",
    });
  }

  const networkName =
    env("ARC_NETWORK_NAME") ?? env("NEXT_PUBLIC_ARC_NETWORK_NAME") ?? "Arc Testnet";
  const explorerApiUrl = env("ARC_EXPLORER_API_URL"); // e.g. https://testnet.arcscan.app
  const rpcUrl = env("ARC_RPC_URL");

  if (!explorerApiUrl && !rpcUrl) {
    return emptyResult(address, networkName, "unavailable", "Arc data source is not configured yet.");
  }

  const addrLower = address.toLowerCase();

  // -------------------------------------------------------------------------
  // Blockscout v2 — ArcScan Testnet primary data source
  // -------------------------------------------------------------------------
  if (explorerApiUrl) {
    try {
      const apiBase = `${explorerApiUrl}/api/v2`;

      // Fetch transactions and token transfers in parallel
      const [rawTxs, rawTokenTransfers] = await Promise.all([
        blockscoutFetchAll<BscTx>(
          apiBase,
          `/addresses/${address}/transactions`
        ).catch((err) => {
          logger.warn({ err }, "ArcScan transactions fetch failed");
          return null;
        }),
        blockscoutFetchAll<BscTokenTransfer>(
          apiBase,
          `/addresses/${address}/token-transfers`
        ).catch((err) => {
          logger.warn({ err }, "ArcScan token-transfers fetch failed");
          return [] as BscTokenTransfer[];
        }),
      ]);

      // If transactions fetch failed entirely, try RPC fallback
      if (rawTxs === null) {
        if (rpcUrl) {
          try {
            const rpcData = await rpcFallback(rpcUrl, address);
            return emptyResult(
              address,
              networkName,
              "partial",
              `Partial data available. Full wallet history could not be retrieved. Outgoing transaction count: ${rpcData.txCount}.`
            );
          } catch {
            /* fall through */
          }
        }
        return emptyResult(
          address,
          networkName,
          "unavailable",
          "Unable to fetch Arc explorer data right now. Please try again later."
        );
      }

      // No transactions at all
      if (rawTxs.length === 0) {
        return {
          ...emptyResult(address, networkName, "full", null),
          arcScore: 0,
          scoreLabel: "No Activity Found",
        };
      }

      // -----------------------------------------------------------------------
      // Build token / NFT lookup maps from token transfers
      // -----------------------------------------------------------------------
      const nftTransferMap = new Map<string, BscTokenTransfer[]>(); // txHash → transfers
      const tokenTransferMap = new Map<string, BscTokenTransfer[]>();

      for (const t of rawTokenTransfers ?? []) {
        const isNft = t.token.type === "ERC-721" || t.token.type === "ERC-1155";
        const map = isNft ? nftTransferMap : tokenTransferMap;
        const list = map.get(t.transaction_hash) ?? [];
        list.push(t);
        map.set(t.transaction_hash, list);
      }

      // -----------------------------------------------------------------------
      // Process transactions
      // -----------------------------------------------------------------------
      const transactions: TransactionRecord[] = rawTxs.map((tx) => ({
        hash: tx.hash,
        type: classifyBscTx(tx, address),
        from: tx.from?.hash ?? address,
        to: tx.to?.hash ?? null,
        date: tx.timestamp,
        status: tx.status === "ok" ? "success" : tx.status === "error" ? "failed" : "pending",
        blockNumber: String(tx.block_number),
      }));

      // Active days & weeks
      const daySet = new Set<string>();
      const weekSet = new Set<string>();
      for (const tx of rawTxs) {
        const d = tx.timestamp.slice(0, 10);
        daySet.add(d);
        weekSet.add(isoWeek(tx.timestamp));
      }

      // Unique contracts — only count `to` addresses where `is_contract` is true
      const contractMap = new Map<
        string,
        { name: string | null; interactions: number; lastTs: string }
      >();
      for (const tx of rawTxs) {
        const toAddr = tx.to?.hash?.toLowerCase();
        if (!toAddr) continue;
        if (!tx.to?.is_contract) continue; // skip wallet-to-wallet transfers
        const existing = contractMap.get(toAddr);
        if (existing) {
          existing.interactions++;
          if (tx.timestamp > existing.lastTs) existing.lastTs = tx.timestamp;
        } else {
          contractMap.set(toAddr, {
            name: tx.to?.name ?? null,
            interactions: 1,
            lastTs: tx.timestamp,
          });
        }
      }

      const contracts: ContractRecord[] = Array.from(contractMap.entries()).map(
        ([addr, info]) => ({
          address: addr,
          name: info.name,
          category: null,
          interactions: info.interactions,
          lastInteraction: info.lastTs,
        })
      );

      // NFT records
      const nfts: NftRecord[] = [];
      for (const [txHash, transfers] of nftTransferMap.entries()) {
        for (const t of transfers) {
          nfts.push({
            contractAddress: t.token.address,
            collectionName: t.token.name ?? null,
            tokenId: t.total?.token_id ?? null,
            eventType:
              t.from?.hash?.toLowerCase() === addrLower
                ? "Transfer Out"
                : t.from?.hash?.toLowerCase() ===
                  "0x0000000000000000000000000000000000000000"
                ? "Mint"
                : "Transfer In",
            date: t.timestamp,
            transactionHash: txHash,
          });
        }
      }

      // Weekly activity chart
      const weeklyMap = new Map<string, number>();
      for (const tx of rawTxs) {
        const w = isoWeek(tx.timestamp);
        weeklyMap.set(w, (weeklyMap.get(w) ?? 0) + 1);
      }
      const weeklyActivity: WeeklyActivity[] = Array.from(weeklyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([week, count]) => ({ week, count }));

      // First / last activity (rawTxs sorted newest-first by Blockscout default)
      const timestamps = rawTxs.map((t) => t.timestamp).filter(Boolean);
      const firstActivity = timestamps.length
        ? timestamps[timestamps.length - 1]
        : null;
      const lastActivity = timestamps.length ? timestamps[0] : null;

      // Protocols
      const protocolInteractions = new Map<
        string,
        { count: number; first: string; last: string }
      >();
      for (const tx of rawTxs) {
        const toAddr = (tx.to?.hash ?? "").toLowerCase();
        for (const protocol of ARC_PROTOCOLS) {
          if (protocol.contracts.some((c) => c.toLowerCase() === toAddr)) {
            const existing = protocolInteractions.get(protocol.id);
            if (existing) {
              existing.count++;
              if (tx.timestamp < existing.first) existing.first = tx.timestamp;
              if (tx.timestamp > existing.last) existing.last = tx.timestamp;
            } else {
              protocolInteractions.set(protocol.id, {
                count: 1,
                first: tx.timestamp,
                last: tx.timestamp,
              });
            }
          }
        }
      }

      const protocols: ProtocolRecord[] = ARC_PROTOCOLS.filter((p) =>
        protocolInteractions.has(p.id)
      ).map((p) => {
        const info = protocolInteractions.get(p.id)!;
        return {
          id: p.id,
          name: p.name,
          category: p.category,
          interactions: info.count,
          firstInteraction: info.first,
          lastInteraction: info.last,
          website: p.website ?? null,
        };
      });

      // Score inputs
      const hasDefiSwap = ARC_PROTOCOLS.filter((p) => p.category === "swap").some(
        (p) => protocolInteractions.has(p.id)
      );
      const hasDefiBridge = ARC_PROTOCOLS.filter((p) => p.category === "bridge").some(
        (p) => protocolInteractions.has(p.id)
      );
      const hasDefiLiquidity = ARC_PROTOCOLS.filter(
        (p) => p.category === "liquidity" || p.category === "staking"
      ).some((p) => protocolInteractions.has(p.id));

      const hasNftMint = nfts.some((n) => n.eventType === "Mint");
      const hasNftTransfer = nfts.length > 0;
      const nftContractAddresses = new Set(
        nfts.map((n) => n.contractAddress.toLowerCase())
      );

      const arcLaunchTs = env("ARC_LAUNCH_TIMESTAMP");
      const arcLaunchDate = arcLaunchTs ? new Date(Number(arcLaunchTs) * 1000) : null;

      const scored = calculateScore({
        totalTransactions: rawTxs.length,
        activeDays: daySet.size,
        uniqueContracts: contractMap.size,
        hasDefiSwap,
        hasDefiBridge,
        hasDefiLiquidity,
        hasNftMint,
        hasNftTransfer,
        nftContractCount: nftContractAddresses.size,
        firstActivityDate: firstActivity ? new Date(firstActivity) : null,
        activeWeeks: weekSet.size,
        arcLaunchDate,
      });

      return {
        address,
        network: networkName,
        dataMode: "full",
        totalTransactions: rawTxs.length,
        activeDays: daySet.size,
        uniqueContracts: contractMap.size,
        firstActivity,
        lastActivity,
        projectsFound: protocols.length,
        totalTrackedProjects: ARC_PROTOCOLS.length,
        arcScore: scored.arcScore,
        scoreLabel: scored.scoreLabel,
        scoreBreakdown: scored.scoreBreakdown,
        scamReports: null,
        transactions,
        contracts,
        protocols,
        nfts,
        weeklyActivity,
        error: null,
      };
    } catch (err) {
      logger.error({ err }, "ArcScan API fetch error");
      // Try RPC fallback if available
      if (rpcUrl) {
        try {
          const rpcData = await rpcFallback(rpcUrl, address);
          return emptyResult(
            address,
            networkName,
            "partial",
            `Partial data available. Full wallet history could not be retrieved from ArcScan.`
          );
        } catch {
          /* fall through */
        }
      }
      return emptyResult(
        address,
        networkName,
        "unavailable",
        "Unable to fetch Arc explorer data right now. Please try again later."
      );
    }
  }

  // -------------------------------------------------------------------------
  // RPC only (no explorer API configured)
  // -------------------------------------------------------------------------
  if (rpcUrl) {
    try {
      const rpcData = await rpcFallback(rpcUrl, address);
      return emptyResult(
        address,
        networkName,
        "partial",
        "Partial data available. Full wallet history could not be retrieved from the current data source."
      );
    } catch {
      return emptyResult(
        address,
        networkName,
        "unavailable",
        "Unable to fetch Arc explorer data right now. Please try again later."
      );
    }
  }

  return emptyResult(address, networkName, "unavailable", "Arc data source is not configured yet.");
}
