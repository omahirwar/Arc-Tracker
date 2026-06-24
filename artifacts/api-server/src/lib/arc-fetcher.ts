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
// Helpers
// ---------------------------------------------------------------------------

function formatDate(ts: number | string): string {
  const d = typeof ts === "string" ? new Date(Number(ts) * 1000) : new Date(ts);
  return d.toISOString();
}

function isoWeek(dateStr: string): string {
  const d = new Date(dateStr);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7
  );
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function classifyTx(
  tx: Record<string, string>,
  nftHashes: Set<string>,
  tokenHashes: Set<string>
): TransactionRecord["type"] {
  if (nftHashes.has(tx.hash)) return "NFT Transfer";
  if (tokenHashes.has(tx.hash)) return "Token Transfer";
  if (tx.input && tx.input !== "0x" && tx.input.length > 2) return "Contract Interaction";
  return "Native Transfer";
}

// ---------------------------------------------------------------------------
// Etherscan-compatible explorer API
// ---------------------------------------------------------------------------

interface EtherscanTx {
  hash: string;
  from: string;
  to: string;
  timeStamp: string;
  isError: string;
  input: string;
  contractAddress: string;
  blockNumber: string;
}

interface EtherscanTokenTx {
  hash: string;
  from: string;
  to: string;
  timeStamp: string;
  contractAddress: string;
  tokenName: string;
}

interface EtherscanNftTx {
  hash: string;
  from: string;
  to: string;
  timeStamp: string;
  contractAddress: string;
  tokenName: string;
  tokenID: string;
}

interface EtherscanResponse<T> {
  status: string;
  message: string;
  result: T[] | string;
}

async function etherscanFetch<T>(
  apiUrl: string,
  apiKey: string,
  module: string,
  action: string,
  address: string
): Promise<T[]> {
  const url = new URL(`${apiUrl}/api`);
  url.searchParams.set("module", module);
  url.searchParams.set("action", action);
  url.searchParams.set("address", address);
  url.searchParams.set("startblock", "0");
  url.searchParams.set("endblock", "99999999");
  url.searchParams.set("sort", "asc");
  if (apiKey) url.searchParams.set("apikey", apiKey);

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} from explorer API`);
  const json = (await res.json()) as EtherscanResponse<T>;
  if (json.status !== "1" && json.message !== "OK") {
    if (json.message === "No transactions found") return [];
    if (typeof json.result === "string" && json.result.includes("No records")) return [];
    logger.warn({ message: json.message }, "Explorer API returned non-1 status");
    return [];
  }
  return Array.isArray(json.result) ? (json.result as T[]) : [];
}

// ---------------------------------------------------------------------------
// Blockscout v2 API
// ---------------------------------------------------------------------------

interface BlockscoutTx {
  hash: string;
  from: { hash: string };
  to: { hash: string } | null;
  timestamp: string;
  status: string;
  raw_input: string;
  block_number: number;
}

interface BlockscoutTokenTx {
  transaction_hash: string;
  from: { hash: string };
  to: { hash: string };
  timestamp: string;
  token: { address: string; name: string; type: string };
  total: { token_id?: string };
}

interface BlockscoutPage<T> {
  items: T[];
  next_page_params: unknown;
}

async function blockscoutFetch<T>(
  apiUrl: string,
  path: string
): Promise<T[]> {
  const results: T[] = [];
  let url: string | null = `${apiUrl}${path}`;

  while (url) {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status} from Blockscout API`);
    const json = (await res.json()) as BlockscoutPage<T>;
    results.push(...json.items);
    // Pagination guard: max 500 items to avoid infinite loops
    if (!json.next_page_params || results.length >= 500) break;
    const params = new URLSearchParams(
      Object.entries(json.next_page_params as Record<string, string>)
    );
    url = `${apiUrl}${path}?${params.toString()}`;
  }
  return results;
}

// ---------------------------------------------------------------------------
// RPC-only fallback
// ---------------------------------------------------------------------------

async function rpcFallback(
  rpcUrl: string,
  address: string
): Promise<{ txCount: number; balance: string }> {
  const client = createPublicClient({
    transport: http(rpcUrl, { timeout: 15000 }),
  });
  const [txCount, balance] = await Promise.all([
    client.getTransactionCount({ address: address as `0x${string}` }),
    client.getBalance({ address: address as `0x${string}` }),
  ]);
  return { txCount, balance: balance.toString() };
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

  const networkName = env("ARC_NETWORK_NAME") ?? env("NEXT_PUBLIC_ARC_NETWORK_NAME") ?? "Arc Testnet";
  const explorerApiUrl = env("ARC_EXPLORER_API_URL");
  const explorerApiKey = env("ARC_EXPLORER_API_KEY") ?? "";
  const rpcUrl = env("ARC_RPC_URL");

  if (!explorerApiUrl && !rpcUrl) {
    return {
      address,
      network: networkName,
      dataMode: "unavailable",
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
      error: "Arc data source is not configured yet.",
    };
  }

  let rawTxs: EtherscanTx[] = [];
  let rawTokenTxs: EtherscanTokenTx[] = [];
  let rawNftTxs: EtherscanNftTx[] = [];
  let dataMode: "full" | "partial" = "full";
  let fetchError: string | null = null;

  // --- Try Etherscan-compatible API first ---
  if (explorerApiUrl) {
    try {
      const [txs, tokenTxs, nftTxs] = await Promise.all([
        etherscanFetch<EtherscanTx>(
          explorerApiUrl, explorerApiKey, "account", "txlist", address
        ).catch(async () => {
          // Try Blockscout v2 instead
          logger.info("Etherscan txlist failed, trying Blockscout v2");
          return null;
        }),
        etherscanFetch<EtherscanTokenTx>(
          explorerApiUrl, explorerApiKey, "account", "tokentx", address
        ).catch(() => [] as EtherscanTokenTx[]),
        etherscanFetch<EtherscanNftTx>(
          explorerApiUrl, explorerApiKey, "account", "tokennfttx", address
        ).catch(() => [] as EtherscanNftTx[]),
      ]);

      if (txs === null) {
        // Etherscan API failed — try Blockscout v2
        throw new Error("Etherscan API failed, try Blockscout");
      }

      rawTxs = txs;
      rawTokenTxs = tokenTxs;
      rawNftTxs = nftTxs;
    } catch {
      // Try Blockscout v2
      try {
        const [bscTxs, bscTokenTxs] = await Promise.all([
          blockscoutFetch<BlockscoutTx>(
            explorerApiUrl,
            `/api/v2/addresses/${address}/transactions`
          ),
          blockscoutFetch<BlockscoutTokenTx>(
            explorerApiUrl,
            `/api/v2/addresses/${address}/token-transfers`
          ),
        ]);

        // Convert Blockscout format to Etherscan-like format
        rawTxs = bscTxs.map((t) => ({
          hash: t.hash,
          from: t.from?.hash ?? address,
          to: t.to?.hash ?? "",
          timeStamp: String(Math.floor(new Date(t.timestamp).getTime() / 1000)),
          isError: t.status === "error" ? "1" : "0",
          input: t.raw_input ?? "0x",
          contractAddress: "",
          blockNumber: String(t.block_number),
        }));

        rawNftTxs = bscTokenTxs
          .filter((t) => t.token.type === "ERC-721" || t.token.type === "ERC-1155")
          .map((t) => ({
            hash: t.transaction_hash,
            from: t.from?.hash ?? address,
            to: t.to?.hash ?? address,
            timeStamp: String(Math.floor(new Date(t.timestamp).getTime() / 1000)),
            contractAddress: t.token.address,
            tokenName: t.token.name ?? "",
            tokenID: t.total?.token_id ?? "",
          }));

        rawTokenTxs = bscTokenTxs
          .filter((t) => t.token.type === "ERC-20")
          .map((t) => ({
            hash: t.transaction_hash,
            from: t.from?.hash ?? address,
            to: t.to?.hash ?? address,
            timeStamp: String(Math.floor(new Date(t.timestamp).getTime() / 1000)),
            contractAddress: t.token.address,
            tokenName: t.token.name ?? "",
          }));
      } catch (blockscoutErr) {
        logger.warn({ err: blockscoutErr }, "Both Etherscan and Blockscout APIs failed");
        // Fall through to RPC if available
        if (rpcUrl) {
          try {
            const rpcData = await rpcFallback(rpcUrl, address);
            dataMode = "partial";
            fetchError = "Partial data available. Full wallet history could not be retrieved from the current data source.";
            // With RPC only we can show tx count but not full history
            return {
              address,
              network: networkName,
              dataMode: "partial",
              totalTransactions: rpcData.txCount,
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
              error: fetchError,
            };
          } catch {
            return {
              address,
              network: networkName,
              dataMode: "unavailable",
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
              error: "Unable to fetch Arc explorer data right now. Please try again later.",
            };
          }
        }
        fetchError = "Unable to fetch Arc explorer data right now. Please try again later.";
        dataMode = "partial";
      }
    }
  } else if (rpcUrl) {
    // RPC only
    try {
      const rpcData = await rpcFallback(rpcUrl, address);
      dataMode = "partial";
      return {
        address,
        network: networkName,
        dataMode: "partial",
        totalTransactions: rpcData.txCount,
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
        error: "Partial data available. Full wallet history could not be retrieved from the current data source.",
      };
    } catch {
      return {
        address,
        network: networkName,
        dataMode: "unavailable",
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
        error: "Unable to fetch Arc explorer data right now. Please try again later.",
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Process fetched data
  // ---------------------------------------------------------------------------

  const nftHashes = new Set(rawNftTxs.map((t) => t.hash));
  const tokenHashes = new Set(rawTokenTxs.map((t) => t.hash));

  // Build transactions list
  const transactions: TransactionRecord[] = rawTxs.map((tx) => ({
    hash: tx.hash,
    type: classifyTx(tx as Record<string, string>, nftHashes, tokenHashes),
    from: tx.from,
    to: tx.to || null,
    date: formatDate(tx.timeStamp),
    status: tx.isError === "1" ? "failed" : "success",
    blockNumber: tx.blockNumber,
  }));

  // Active days
  const daySet = new Set<string>();
  const weekSet = new Set<string>();
  for (const tx of rawTxs) {
    const d = new Date(Number(tx.timeStamp) * 1000);
    daySet.add(d.toISOString().slice(0, 10));
    weekSet.add(isoWeek(d.toISOString()));
  }

  // Unique contracts interacted with
  const contractMap = new Map<string, { name: string | null; category: string | null; count: number; lastTs: number }>();
  for (const tx of rawTxs) {
    const target = tx.to || tx.contractAddress;
    if (!target || target === address.toLowerCase()) continue;
    if (tx.input === "0x" || tx.input === "") continue; // skip native transfers
    const existing = contractMap.get(target.toLowerCase());
    const ts = Number(tx.timeStamp);
    if (existing) {
      existing.count++;
      if (ts > existing.lastTs) existing.lastTs = ts;
    } else {
      contractMap.set(target.toLowerCase(), { name: null, category: null, count: 1, lastTs: ts });
    }
  }

  const contracts: ContractRecord[] = Array.from(contractMap.entries()).map(
    ([addr, info]) => ({
      address: addr,
      name: info.name,
      category: info.category,
      interactions: info.count,
      lastInteraction: info.lastTs > 0 ? formatDate(info.lastTs) : null,
    })
  );

  // Protocols
  const addrLower = address.toLowerCase();
  const protocolInteractions = new Map<
    string,
    { count: number; first: number; last: number }
  >();

  for (const tx of rawTxs) {
    const target = (tx.to || tx.contractAddress || "").toLowerCase();
    for (const protocol of ARC_PROTOCOLS) {
      if (protocol.contracts.some((c) => c.toLowerCase() === target)) {
        const existing = protocolInteractions.get(protocol.id);
        const ts = Number(tx.timeStamp);
        if (existing) {
          existing.count++;
          if (ts < existing.first) existing.first = ts;
          if (ts > existing.last) existing.last = ts;
        } else {
          protocolInteractions.set(protocol.id, { count: 1, first: ts, last: ts });
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
      firstInteraction: formatDate(info.first),
      lastInteraction: formatDate(info.last),
      website: p.website ?? null,
    };
  });

  // NFTs
  const nfts: NftRecord[] = rawNftTxs.map((tx) => ({
    contractAddress: tx.contractAddress,
    collectionName: tx.tokenName || null,
    tokenId: tx.tokenID || null,
    eventType: tx.from.toLowerCase() === addrLower ? "Transfer Out" : "Transfer In / Mint",
    date: formatDate(tx.timeStamp),
    transactionHash: tx.hash,
  }));

  // Weekly activity chart data
  const weeklyMap = new Map<string, number>();
  for (const tx of rawTxs) {
    const d = new Date(Number(tx.timeStamp) * 1000);
    const weekKey = isoWeek(d.toISOString());
    weeklyMap.set(weekKey, (weeklyMap.get(weekKey) ?? 0) + 1);
  }
  const weeklyActivity: WeeklyActivity[] = Array.from(weeklyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, count]) => ({ week, count }));

  // First / last activity
  const timestamps = rawTxs.map((t) => Number(t.timeStamp)).filter(Boolean);
  const firstTs = timestamps.length > 0 ? Math.min(...timestamps) : null;
  const lastTs = timestamps.length > 0 ? Math.max(...timestamps) : null;

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

  const hasNftMint = rawNftTxs.some(
    (t) => t.from.toLowerCase() === "0x0000000000000000000000000000000000000000"
  );
  const hasNftTransfer = rawNftTxs.length > 0;
  const nftContractAddresses = new Set(rawNftTxs.map((t) => t.contractAddress.toLowerCase()));

  // Arc launch date from env (optional)
  const arcLaunchTs = env("ARC_LAUNCH_TIMESTAMP");
  const arcLaunchDate = arcLaunchTs ? new Date(Number(arcLaunchTs) * 1000) : null;

  const scored =
    dataMode === "full"
      ? calculateScore({
          totalTransactions: rawTxs.length,
          activeDays: daySet.size,
          uniqueContracts: contractMap.size,
          hasDefiSwap,
          hasDefiBridge,
          hasDefiLiquidity,
          hasNftMint,
          hasNftTransfer,
          nftContractCount: nftContractAddresses.size,
          firstActivityDate: firstTs ? new Date(firstTs * 1000) : null,
          activeWeeks: weekSet.size,
          arcLaunchDate,
        })
      : { arcScore: null, scoreLabel: null, scoreBreakdown: null };

  return {
    address,
    network: networkName,
    dataMode,
    totalTransactions: rawTxs.length,
    activeDays: daySet.size,
    uniqueContracts: contractMap.size,
    firstActivity: firstTs ? formatDate(firstTs) : null,
    lastActivity: lastTs ? formatDate(lastTs) : null,
    projectsFound: protocols.length,
    totalTrackedProjects: ARC_PROTOCOLS.length,
    arcScore: scored.arcScore,
    scoreLabel: scored.scoreLabel,
    scoreBreakdown: scored.scoreBreakdown,
    scamReports: null, // No verified scam-report source configured
    transactions,
    contracts,
    protocols,
    nfts,
    weeklyActivity,
    error: fetchError,
  };
}
