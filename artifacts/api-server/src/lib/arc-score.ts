/**
 * Arc Testnet Activity Score — Strict formula
 *
 * Hard thresholds designed so the average casual user scores 20–45,
 * consistent users score 50–70, and only serious, long-running wallets
 * can reach 80–100.
 *
 * Total max: 100 points across 7 categories.
 */

export interface ScoreCategory {
  score: number | null;
  max: number;
  label: string;
}

export interface ScoreBreakdown {
  transactions: ScoreCategory;
  activeDays: ScoreCategory;
  contracts: ScoreCategory;
  consistency: ScoreCategory;
  contractDepth: ScoreCategory;
  nft: ScoreCategory;
  earlyActivity: ScoreCategory;
}

export interface ScoredActivity {
  arcScore: number | null;
  scoreLabel: string | null;
  scoreBreakdown: ScoreBreakdown;
}

export interface ScoreInputs {
  totalTransactions: number;
  activeDays: number;
  uniqueContracts: number;
  contractInteractionCount: number; // txs that are contract calls (not native transfers)
  hasNftMint: boolean;
  hasNftTransfer: boolean;
  nftContractCount: number;
  activeWeeks: number;
  firstActivityDate: Date | null;
  arcLaunchDate: Date | null;
}

// ---------------------------------------------------------------------------
// A. Total Transactions — 25 pts
// Strict thresholds: need 200+ for max
// ---------------------------------------------------------------------------
function scoreTransactions(n: number): number {
  if (n >= 200) return 25;
  if (n >= 100) return 20;
  if (n >= 50)  return 15;
  if (n >= 20)  return 10;
  if (n >= 10)  return 7;
  if (n >= 5)   return 4;
  if (n >= 1)   return 2;
  return 0;
}

// ---------------------------------------------------------------------------
// B. Active Days — 20 pts
// Need 60+ days for max (serious users only)
// ---------------------------------------------------------------------------
function scoreActiveDays(days: number): number {
  if (days >= 60) return 20;
  if (days >= 30) return 15;
  if (days >= 14) return 10;
  if (days >= 7)  return 7;
  if (days >= 3)  return 4;
  if (days >= 1)  return 2;
  return 0;
}

// ---------------------------------------------------------------------------
// C. Unique Smart Contracts — 15 pts
// ---------------------------------------------------------------------------
function scoreContracts(n: number): number {
  if (n >= 20) return 15;
  if (n >= 10) return 11;
  if (n >= 5)  return 7;
  if (n >= 2)  return 4;
  if (n >= 1)  return 2;
  return 0;
}

// ---------------------------------------------------------------------------
// D. Weekly Consistency — 15 pts
// Rewards wallets that return week-over-week
// ---------------------------------------------------------------------------
function scoreConsistency(weeks: number): number {
  if (weeks >= 16) return 15;
  if (weeks >= 8)  return 11;
  if (weeks >= 4)  return 7;
  if (weeks >= 2)  return 4;
  if (weeks >= 1)  return 2;
  return 0;
}

// ---------------------------------------------------------------------------
// E. Contract Interaction Depth — 10 pts
// % of txs that are actual contract calls (not just ETH sends)
// ---------------------------------------------------------------------------
function scoreContractDepth(totalTx: number, contractCallCount: number): number {
  if (totalTx === 0) return 0;
  const ratio = contractCallCount / totalTx;
  if (ratio >= 0.7)  return 10;
  if (ratio >= 0.5)  return 7;
  if (ratio >= 0.3)  return 5;
  if (ratio >= 0.1)  return 3;
  return 1;
}

// ---------------------------------------------------------------------------
// F. NFT Activity — 10 pts
// ---------------------------------------------------------------------------
function scoreNft(hasMint: boolean, hasTransfer: boolean, collectionCount: number): number {
  let s = 0;
  if (hasMint)                 s += 5;
  if (hasTransfer && !hasMint) s += 3;
  if (collectionCount >= 3)    s += 3;
  else if (collectionCount >= 2) s += 1;
  return Math.min(s, 10);
}

// ---------------------------------------------------------------------------
// G. Early Activity — 5 pts (only if Arc launch date configured)
// ---------------------------------------------------------------------------
function scoreEarlyActivity(
  firstDate: Date | null,
  launchDate: Date | null
): number | null {
  if (!firstDate || !launchDate) return null;
  const daysDiff = Math.floor(
    (firstDate.getTime() - launchDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysDiff < 0)   return 5; // before launch = extra early
  if (daysDiff <= 30) return 5;
  if (daysDiff <= 90) return 3;
  return 1;
}

// ---------------------------------------------------------------------------
// Score label
// ---------------------------------------------------------------------------
function getScoreLabel(score: number): string {
  if (score >= 85) return "Elite Activity";
  if (score >= 70) return "Strong Activity";
  if (score >= 50) return "Good Activity";
  if (score >= 30) return "Growing Activity";
  if (score >= 10) return "Low Activity";
  return "No Activity Found";
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
export function calculateScore(inputs: ScoreInputs): ScoredActivity {
  const txS        = scoreTransactions(inputs.totalTransactions);
  const daysS      = scoreActiveDays(inputs.activeDays);
  const contractS  = scoreContracts(inputs.uniqueContracts);
  const consistS   = scoreConsistency(inputs.activeWeeks);
  const depthS     = scoreContractDepth(inputs.totalTransactions, inputs.contractInteractionCount);
  const nftS       = scoreNft(inputs.hasNftMint, inputs.hasNftTransfer, inputs.nftContractCount);
  const earlyS     = scoreEarlyActivity(inputs.firstActivityDate, inputs.arcLaunchDate);

  const earlyMax   = earlyS === null ? 0 : 5;
  const totalMax   = 25 + 20 + 15 + 15 + 10 + 10 + earlyMax;
  const rawTotal   = txS + daysS + contractS + consistS + depthS + nftS + (earlyS ?? 0);

  // Normalise to 100 — if earlyActivity is unavailable, denominator shrinks
  const normalized = Math.round((rawTotal / totalMax) * 100);
  const arcScore   = Math.max(0, Math.min(100, normalized));

  const breakdown: ScoreBreakdown = {
    transactions: {
      score: txS, max: 25,
      label: `${inputs.totalTransactions} transaction${inputs.totalTransactions !== 1 ? "s" : ""}`,
    },
    activeDays: {
      score: daysS, max: 20,
      label: `${inputs.activeDays} unique day${inputs.activeDays !== 1 ? "s" : ""} active`,
    },
    contracts: {
      score: contractS, max: 15,
      label: `${inputs.uniqueContracts} smart contract${inputs.uniqueContracts !== 1 ? "s" : ""}`,
    },
    consistency: {
      score: consistS, max: 15,
      label: `${inputs.activeWeeks} active week${inputs.activeWeeks !== 1 ? "s" : ""}`,
    },
    contractDepth: {
      score: depthS, max: 10,
      label: inputs.totalTransactions > 0
        ? `${Math.round((inputs.contractInteractionCount / inputs.totalTransactions) * 100)}% contract calls`
        : "No transactions",
    },
    nft: {
      score: nftS, max: 10,
      label: inputs.hasNftMint || inputs.hasNftTransfer
        ? `${inputs.nftContractCount} collection${inputs.nftContractCount !== 1 ? "s" : ""} touched`
        : "No NFT activity",
    },
    earlyActivity: {
      score: earlyS, max: 5,
      label: earlyS === null
        ? "Unavailable — launch date not configured"
        : earlyS === 5 ? "Active within first 30 days"
        : earlyS === 3 ? "Active within first 90 days"
        : "Joined after early period",
    },
  };

  return { arcScore, scoreLabel: getScoreLabel(arcScore), scoreBreakdown: breakdown };
}
