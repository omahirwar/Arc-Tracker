# Arc Activity Checker

Analyze public Arc Testnet wallet activity — transaction history, protocol interactions, and an independent activity score. No wallet connection required.

---

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

#### Required configuration:

| Variable | Description |
|---|---|
| `ARC_RPC_URL` | Arc Testnet RPC endpoint (e.g. `https://rpc.arc.testnet`) |
| `ARC_EXPLORER_API_URL` | Arc block explorer base URL (Etherscan-compatible or Blockscout v2) |
| `ARC_EXPLORER_API_KEY` | Explorer API key (leave blank if not required) |

#### Optional configuration:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_ARC_EXPLORER_URL` / `VITE_ARC_EXPLORER_URL` | Explorer URL used for transaction links in the UI |
| `ARC_LAUNCH_TIMESTAMP` | Unix timestamp (seconds) of Arc Testnet launch — enables "Early Activity" score |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis for production-scale rate limiting (falls back to in-memory) |

### 3. Add Arc protocol contracts (optional)

Edit `artifacts/api-server/src/lib/arc-protocols.ts` and add verified Arc ecosystem protocol contract addresses:

```typescript
export const ARC_PROTOCOLS: ArcProtocol[] = [
  {
    id: "arc-dex",
    name: "Arc DEX",
    category: "swap",
    contracts: ["0xYourContractAddressHere"],
    website: "https://example.com",
  },
  // Add more protocols...
];
```

Until contracts are added, `projectsFound` and `totalTrackedProjects` will both be 0.

### 4. Add a scam report source (optional)

To show real scam report data in Card 3:
1. Find a verified public API that tracks EVM address scam reports
2. Add its URL/key as an env var in `.env`
3. Call it in `artifacts/api-server/src/lib/arc-fetcher.ts` in the `fetchWalletActivity` function — set the `scamReports` field in the return value

### 5. Run in development

```bash
# Start the API server
pnpm --filter @workspace/api-server run dev

# Start the frontend (in another terminal)
pnpm --filter @workspace/arc-activity-checker run dev
```

---

## Architecture

- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui at `/`
- **API**: Express 5 at `/api`
  - `GET /api/check?address=0x...` — wallet activity endpoint
  - `GET /api/healthz` — health check
- **Data sources** (tried in priority order):
  1. Etherscan-compatible explorer API
  2. Blockscout v2 API
  3. viem RPC fallback (partial data only)
- **Rate limiting**: In-memory (10 req/min per IP) — swap to Upstash Redis for production scale
- **Caching**: In-memory 5-minute TTL — swap to Upstash Redis for production scale

## Key files

| File | Purpose |
|---|---|
| `artifacts/api-server/src/lib/arc-protocols.ts` | **Add verified Arc protocol contracts here** |
| `artifacts/api-server/src/lib/arc-fetcher.ts` | Data fetching logic (Explorer API + RPC fallback) |
| `artifacts/api-server/src/lib/arc-score.ts` | Score calculation formula |
| `artifacts/api-server/src/routes/check.ts` | `/api/check` route handler |
| `artifacts/arc-activity-checker/src/pages/Home.tsx` | Main page with address input |
| `artifacts/arc-activity-checker/src/components/` | UI components |

## Security

- No wallet connection, WalletConnect, MetaMask, or signature requests
- User pastes a public wallet address only — reads public on-chain data
- All blockchain API calls happen server-side; no API keys exposed to the client
- Address validated server-side with viem `isAddress()`
- Rate limited per IP
- All API responses validated with Zod schemas
