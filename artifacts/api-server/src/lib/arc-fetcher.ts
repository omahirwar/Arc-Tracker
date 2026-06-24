import { createPublicClient, http, isAddress } from "viem";
import { logger } from "./logger.js";
import { ARC_PROTOCOLS } from "./arc-protocols.js";
import { calculateScore } from "./arc-score.js";

function env(key: string): string | undefined {
  return process.env[key] ?? undefined;
}

export interface TransactionRecord {
  hash: string;
  type:
    | "Contract Interaction"
    | "Native Transfer"
    | "Token Transfer"
    | "NFT Transfer"
    | "Unknown";
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
  total?: {
    token_id?: string;
  };
}

interface BscPage<T> {
  items: T[];
  next_page_params: Record<string, string> | null;
}

async function blockscoutFetchAll<T>(
  baseUrl: string,
  apiPath: string,
  maxItems = 1000,
): Promise<T[]> {
  const results: T[] = [];
  let url: string | null = `${baseUrl}${apiPath}`;

  while (url && results.length < maxItems) {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      throw new Error(`ArcScan API HTTP ${response.status}: ${url}`);
    }

    const json = (await response.json()) as BscPage<T>;
    const items = json.items ?? [];
    results.push(...items);

    if (
      !json.next_page_params ||
      Object.keys(json.next_page_params).length === 0
    ) {
      break;
    }

    const params = new URLSearchParams(json.next_page_params);
    url = `${baseUrl}${apiPath}?${params.toString()}`;
  }

  return results.slice(0, maxItems);
}

function isoWeek(dateStr: string): string {
  const date = new Date(dateStr);
  const jan1 = new Date(date.getFullYear(), 0, 1);

  const week = Math.ceil(
    ((date.getTime() - jan1.getTime()) / 86_400_000 + jan1.getDay() + 1) / 7,
  );

  return `${date.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function classifyBscTx(
  tx: BscTx,
  address: string,
): TransactionRecord["type"] {
  const toAddress = tx.to?.hash?.toLowerCase() ?? "";
  const fromAddress = tx.from?.hash?.toLowerCase() ?? "";
  const walletAddress = address.toLowerCase();

  const nftTransfer = tx.token_transfers?.find(
    (transfer) =>
      transfer.token.type === "ERC-721" ||
      transfer.token.type === "ERC-1155",
  );

  if (nftTransfer) return "NFT Transfer";

  const tokenTransfer = tx.token_transfers?.find(
    (transfer) => transfer.token.type === "ERC-20",
  );

  if (tokenTransfer) return "Token Transfer";

  if (
    tx.to?.is_contract &&
    tx.raw_input &&
    tx.raw_input !== "0x" &&
    tx.raw_input.length > 2
  ) {
    return "Contract Interaction";
  }

  if (!toAddress || toAddress === fromAddress || fromAddress !== walletAddress) {
    return "Native Transfer";
  }

  return "Native Transfer";
}

async function rpcFallback(
  rpcUrl: string,
  address: string,
): Promise<{ txCount: number }> {
  const client = createPublicClient({
    transport: http(rpcUrl, { timeout: 15_000 }),
  });

  const txCount = await client.getTransactionCount({
    address: address as `0x${string}`,
  });

  return { txCount };
}

function emptyResult(
  address: string,
  networkName: string,
  dataMode: WalletActivityResult["dataMode"],
  error: string | null,
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

export async function fetchWalletActivity(
  address: string,
): Promise<WalletActivityResult> {
  if (!isAddress(address)) {
    throw Object.assign(new Error("Please enter a valid EVM wallet address."), {
      code: "INVALID_ADDRESS",
    });
  }

  const networkName =
    env("ARC_NETWORK_NAME") ??
    env("NEXT_PUBLIC_ARC_NETWORK_NAME") ??
    "Arc Testnet";

  const explorerApiUrl = env("ARC_EXPLORER_API_URL");
  const rpcUrl = env("ARC_RPC_URL");

  if (!explorerApiUrl && !rpcUrl) {
    return emptyResult(
      address,
      networkName,
      "unavailable",
      "Arc data source is not configured yet.",
    );
  }

  const addressLower = address.toLowerCase();

  if (explorerApiUrl) {
    try {
      const apiBase = `${explorerApiUrl.replace(/\/$/, "")}/api/v2`;

      const [rawTransactions, rawTokenTransfers] = await Promise.all([
        blockscoutFetchAll<BscTx>(
          apiBase,
          `/addresses/${address}/transactions`,
        ).catch((error) => {
          logger.warn({ error }, "ArcScan transactions fetch failed");
          return null;
        }),

        blockscoutFetchAll<BscTokenTransfer>(
          apiBase,
          `/addresses/${address}/token-transfers`,
        ).catch((error) => {
          logger.warn({ error }, "ArcScan token transfers fetch failed");
          return [] as BscTokenTransfer[];
        }),
      ]);

      if (rawTransactions === null) {
        if (rpcUrl) {
          try {
            const rpcData = await rpcFallback(rpcUrl, address);

            return emptyResult(
              address,
              networkName,
              "partial",
              `Partial data available. Full wallet history could not be retrieved. Outgoing transaction count: ${rpcData.txCount}.`,
            );
          } catch {
            // Continue to unavailable result below.
          }
        }

        return emptyResult(
          address,
          networkName,
          "unavailable",
          "Unable to fetch Arc explorer data right now. Please try again later.",
        );
      }

      if (rawTransactions.length === 0) {
        return {
          ...emptyResult(address, networkName, "full", null),
          arcScore: 0,
          scoreLabel: "No Activity Found",
        };
      }

      const nftTransferMap = new Map<string, BscTokenTransfer[]>();

      for (const transfer of rawTokenTransfers) {
        const isNft =
          transfer.token.type === "ERC-721" ||
          transfer.token.type === "ERC-1155";

        if (!isNft) continue;

        const list = nftTransferMap.get(transfer.transaction_hash) ?? [];
        list.push(transfer);
        nftTransferMap.set(transfer.transaction_hash, list);
      }

      const transactions: TransactionRecord[] = rawTransactions.map((tx) => ({
        hash: tx.hash,
        type: classifyBscTx(tx, address),
        from: tx.from?.hash ?? address,
        to: tx.to?.hash ?? null,
        date: tx.timestamp,
        status:
          tx.status === "ok"
            ? "success"
            : tx.status === "error"
              ? "failed"
              : "pending",
        blockNumber: String(tx.block_number),
      }));

      const activeDays = new Set<string>();
      const activeWeeks = new Set<string>();

      for (const tx of rawTransactions) {
        activeDays.add(tx.timestamp.slice(0, 10));
        activeWeeks.add(isoWeek(tx.timestamp));
      }

      const contractMap = new Map<
        string,
        {
          name: string | null;
          interactions: number;
          lastTimestamp: string;
        }
      >();

      for (const tx of rawTransactions) {
        const contractAddress = tx.to?.hash?.toLowerCase();

        if (!contractAddress || !tx.to?.is_contract) continue;

        const existing = contractMap.get(contractAddress);

        if (existing) {
          existing.interactions += 1;

          if (tx.timestamp > existing.lastTimestamp) {
            existing.lastTimestamp = tx.timestamp;
          }
        } else {
          contractMap.set(contractAddress, {
            name: tx.to.name ?? null,
            interactions: 1,
            lastTimestamp: tx.timestamp,
          });
        }
      }

      const contracts: ContractRecord[] = Array.from(contractMap.entries()).map(
        ([contractAddress, info]) => ({
          address: contractAddress,
          name: info.name,
          category: null,
          interactions: info.interactions,
          lastInteraction: info.lastTimestamp,
        }),
      );

      const nfts: NftRecord[] = [];

      for (const [transactionHash, transfers] of nftTransferMap.entries()) {
        for (const transfer of transfers) {
          const sender = transfer.from?.hash?.toLowerCase();

          nfts.push({
            contractAddress: transfer.token.address,
            collectionName: transfer.token.name ?? null,
            tokenId: transfer.total?.token_id ?? null,
            eventType:
              sender === "0x0000000000000000000000000000000000000000"
                ? "Mint"
                : sender === addressLower
                  ? "Transfer Out"
                  : "Transfer In",
            date: transfer.timestamp,
            transactionHash,
          });
        }
      }

      const weeklyMap = new Map<string, number>();

      for (const tx of rawTransactions) {
        const week = isoWeek(tx.timestamp);
        weeklyMap.set(week, (weeklyMap.get(week) ?? 0) + 1);
      }

      const weeklyActivity: WeeklyActivity[] = Array.from(weeklyMap.entries())
        .sort(([firstWeek], [secondWeek]) =>
          firstWeek.localeCompare(secondWeek),
        )
        .map(([week, count]) => ({ week, count }));

      const timestamps = rawTransactions
        .map((transaction) => transaction.timestamp)
        .filter(Boolean)
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

      const firstActivity = timestamps[0] ?? null;
      const lastActivity = timestamps[timestamps.length - 1] ?? null;

      const protocolInteractions = new Map<
        string,
        {
          count: number;
          first: string;
          last: string;
        }
      >();

      for (const tx of rawTransactions) {
        const destination = (tx.to?.hash ?? "").toLowerCase();

        for (const protocol of ARC_PROTOCOLS) {
          const isProtocolInteraction = protocol.contracts.some(
            (contract) => contract.toLowerCase() === destination,
          );

          if (!isProtocolInteraction) continue;

          const existing = protocolInteractions.get(protocol.id);

          if (existing) {
            existing.count += 1;

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

      const protocols: ProtocolRecord[] = ARC_PROTOCOLS.filter((protocol) =>
        protocolInteractions.has(protocol.id),
      ).map((protocol) => {
        const info = protocolInteractions.get(protocol.id)!;

        return {
          id: protocol.id,
          name: protocol.name,
          category: protocol.category,
          interactions: info.count,
          firstInteraction: info.first,
          lastInteraction: info.last,
          website: protocol.website ?? null,
        };
      });

      const contractInteractionCount = rawTransactions.filter(
        (tx) =>
          tx.to?.is_contract &&
          tx.raw_input &&
          tx.raw_input !== "0x" &&
          tx.raw_input.length > 2,
      ).length;

      const nftContractAddresses = new Set(
        nfts.map((nft) => nft.contractAddress.toLowerCase()),
      );

      const launchTimestamp = env("ARC_LAUNCH_TIMESTAMP");
      const arcLaunchDate = launchTimestamp
        ? new Date(Number(launchTimestamp) * 1000)
        : null;

      const score = calculateScore({
        totalTransactions: rawTransactions.length,
        activeDays: activeDays.size,
        uniqueContracts: contractMap.size,
        contractInteractionCount,
        hasNftMint: nfts.some((nft) => nft.eventType === "Mint"),
        hasNftTransfer: nfts.length > 0,
        nftContractCount: nftContractAddresses.size,
        firstActivityDate: firstActivity ? new Date(firstActivity) : null,
        activeWeeks: activeWeeks.size,
        arcLaunchDate,
      });

      return {
        address,
        network: networkName,
        dataMode: "full",
        totalTransactions: rawTransactions.length,
        activeDays: activeDays.size,
        uniqueContracts: contractMap.size,
        firstActivity,
        lastActivity,
        projectsFound: protocols.length,
        totalTrackedProjects: ARC_PROTOCOLS.length,
        arcScore: score.arcScore,
        scoreLabel: score.scoreLabel,
        scoreBreakdown: score.scoreBreakdown,
        scamReports: null,
        transactions,
        contracts,
        protocols,
        nfts,
        weeklyActivity,
        error: null,
      };
    } catch (error) {
      logger.error({ error }, "ArcScan API fetch error");

      if (rpcUrl) {
        try {
          await rpcFallback(rpcUrl, address);

          return emptyResult(
            address,
            networkName,
            "partial",
            "Partial data available. Full wallet history could not be retrieved from ArcScan.",
          );
        } catch {
          // Continue to unavailable result below.
        }
      }

      return emptyResult(
        address,
        networkName,
        "unavailable",
        "Unable to fetch Arc explorer data right now. Please try again later.",
      );
    }
  }

  if (rpcUrl) {
    try {
      await rpcFallback(rpcUrl, address);

      return emptyResult(
        address,
        networkName,
        "partial",
        "Partial data available. Full wallet history could not be retrieved from the current data source.",
      );
    } catch {
      return emptyResult(
        address,
        networkName,
        "unavailable",
        "Unable to fetch Arc explorer data right now. Please try again later.",
      );
    }
  }

  return emptyResult(
    address,
    networkName,
    "unavailable",
    "Arc data source is not configured yet.",
  );
}
