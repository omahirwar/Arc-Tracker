export interface ScoreCategory {
  score: number | null;
  max: number;
  label: string;
}

export interface ScoreBreakdown {
  transactions: ScoreCategory;
  activeDays: ScoreCategory;
  contracts: ScoreCategory;
  defi: ScoreCategory;
  nft: ScoreCategory;
  earlyActivity: ScoreCategory;
  consistency: ScoreCategory;
}

export interface ScoredActivity {
  arcScore: number | null;
  scoreLabel: string | null;
  scoreBreakdown: ScoreBreakdown;
}

interface ScoreInputs {
  totalTransactions: number;
  activeDays: number;
  uniqueContracts: number;
  hasDefiSwap: boolean;
  hasDefiBridge: boolean;
  hasDefiLiquidity: boolean;
  hasNftMint: boolean;
  hasNftTransfer: boolean;
  nftContractCount: number;
  firstActivityDate: Date | null;
  activeWeeks: number;
  arcLaunchDate: Date | null;
}

function txScore(count: number): number {
  if (count >= 50) return 20;
  if (count >= 25) return 16;
  if (count >= 10) return 12;
  if (count >= 5) return 8;
  if (count >= 1) return 3;
  return 0;
}

function activeDaysScore(days: number): number {
  if (days >= 30) return 20;
  if (days >= 14) return 16;
  if (days >= 7) return 12;
  if (days >= 3) return 7;
  if (days >= 1) return 3;
  return 0;
}

function contractScore(count: number): number {
  if (count >= 10) return 15;
  if (count >= 5) return 10;
  if (count >= 3) return 7;
  if (count >= 1) return 3;
  return 0;
}

function defiScore(hasSwap: boolean, hasBridge: boolean, hasLiquidity: boolean): number {
  return (hasSwap ? 5 : 0) + (hasBridge ? 5 : 0) + (hasLiquidity ? 5 : 0);
}

function nftScore(hasMint: boolean, hasTransfer: boolean, contractCount: number): number {
  let s = 0;
  if (hasMint) s += 5;
  if (hasTransfer) s += 3;
  if (contractCount >= 2) s = Math.min(s + 2, 10);
  return Math.min(s, 10);
}

function earlyActivityScore(
  firstDate: Date | null,
  launchDate: Date | null
): number | null {
  if (!firstDate || !launchDate) return null;
  const daysDiff = Math.floor(
    (firstDate.getTime() - launchDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysDiff <= 30) return 10;
  if (daysDiff <= 90) return 7;
  return 3;
}

function consistencyScore(weeks: number): number {
  if (weeks >= 8) return 10;
  if (weeks >= 4) return 7;
  if (weeks >= 2) return 4;
  if (weeks >= 1) return 2;
  return 0;
}

function scoreLabel(score: number): string {
  if (score >= 80) return "Strong Activity";
  if (score >= 60) return "Good Activity";
  if (score >= 30) return "Growing Activity";
  if (score >= 1) return "Low Activity";
  return "No Activity Found";
}

export function calculateScore(inputs: ScoreInputs): ScoredActivity {
  const arcLaunchDate = inputs.arcLaunchDate;

  const txS = txScore(inputs.totalTransactions);
  const daysS = activeDaysScore(inputs.activeDays);
  const contractS = contractScore(inputs.uniqueContracts);
  const defiS = defiScore(inputs.hasDefiSwap, inputs.hasDefiBridge, inputs.hasDefiLiquidity);
  const nftS = nftScore(inputs.hasNftMint, inputs.hasNftTransfer, inputs.nftContractCount);
  const earlyS = earlyActivityScore(inputs.firstActivityDate, arcLaunchDate);
  const consistS = consistencyScore(inputs.activeWeeks);

  const breakdown: ScoreBreakdown = {
    transactions: { score: txS, max: 20, label: `${inputs.totalTransactions} transactions` },
    activeDays: { score: daysS, max: 20, label: `${inputs.activeDays} active days` },
    contracts: { score: contractS, max: 15, label: `${inputs.uniqueContracts} unique contracts` },
    defi: {
      score: defiS,
      max: 15,
      label: [
        inputs.hasDefiSwap && "swap",
        inputs.hasDefiBridge && "bridge",
        inputs.hasDefiLiquidity && "liquidity/staking",
      ]
        .filter(Boolean)
        .join(", ") || "no DeFi activity",
    },
    nft: {
      score: nftS,
      max: 10,
      label: inputs.hasNftMint || inputs.hasNftTransfer ? "NFT activity found" : "no NFT activity",
    },
    earlyActivity: {
      score: earlyS,
      max: 10,
      label:
        earlyS === null
          ? "Unavailable — launch date not configured"
          : `First tx ${earlyS === 10 ? "within 30 days" : earlyS === 7 ? "within 90 days" : "after 90 days"} of launch`,
    },
    consistency: {
      score: consistS,
      max: 10,
      label: `${inputs.activeWeeks} active week(s)`,
    },
  };

  // Compute total — if earlyActivity has no configured launch date, exclude it from denominator
  const earlyMax = earlyS === null ? 0 : 10;
  const maxPossible = 20 + 20 + 15 + 15 + 10 + earlyMax + 10;
  const rawScore =
    txS + daysS + contractS + defiS + nftS + (earlyS ?? 0) + consistS;

  // Normalise to 100 if earlyActivity is excluded
  const finalScore =
    earlyMax === 0
      ? Math.round((rawScore / 90) * 100)
      : Math.round((rawScore / maxPossible) * 100);

  const clampedScore = Math.max(0, Math.min(100, finalScore));

  return {
    arcScore: clampedScore,
    scoreLabel: scoreLabel(clampedScore),
    scoreBreakdown: breakdown,
  };
}
