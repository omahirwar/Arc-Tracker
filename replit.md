# Arc Activity Checker

A public on-chain activity checker for Arc Testnet wallets. Users paste any EVM wallet address to see their transaction history, protocol interactions, and an independent activity score. No wallet connection required.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/arc-activity-checker run dev` — run the frontend (port 20347)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui + Recharts + framer-motion
- API: Express 5
- Blockchain: viem (RPC calls + address validation)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `lib/api-zod/src/generated/` — generated Zod validation schemas
- `artifacts/arc-activity-checker/src/pages/Home.tsx` — main page
- `artifacts/arc-activity-checker/src/components/` — UI components (DashboardCards, ActivitySummary, tabs)
- `artifacts/api-server/src/routes/check.ts` — `/api/check` route handler
- `artifacts/api-server/src/lib/arc-fetcher.ts` — blockchain data fetching logic
- `artifacts/api-server/src/lib/arc-protocols.ts` — **add verified Arc protocol contracts here**
- `artifacts/api-server/src/lib/arc-score.ts` — activity score calculation formula

## Architecture decisions

- **React+Vite+Express over Next.js** — the Replit pnpm monorepo uses separate frontend and backend artifacts; the api-server artifact handles all server-side logic including rate limiting, caching, and blockchain RPC calls.
- **No secrets on the client** — all API keys (explorer API key, RPC URL) live as server-only env vars; only `VITE_ARC_EXPLORER_URL` is needed on the client for block explorer links.
- **In-memory rate limiting + caching** — 10 req/min per IP, 5-min result TTL; swap `arc-fetcher.ts` / `rate-limiter.ts` for Upstash Redis calls when scaling.
- **Dual explorer API support** — tries Etherscan-compatible API first, falls back to Blockscout v2 format, then falls back to viem RPC (partial data only).
- **Empty protocol registry by design** — `arc-protocols.ts` ships empty; `projectsFound`/`totalTrackedProjects` are 0 until real verified contracts are added.

## Product

- Paste any EVM wallet address → see total transactions, active days, unique contracts, first/last activity
- 3-card dashboard: Wallet Activity Overview (projects found), Arc Score gauge (0–100), Scam Reports
- Detailed tabs: Overview (score breakdown + weekly chart), Transactions, Contracts, Protocols, NFTs
- All data from real Arc blockchain sources; proper empty/error/partial-data states throughout
- No wallet connection, no MetaMask, no signatures, no seed phrases

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After any OpenAPI spec change, run `pnpm --filter @workspace/api-spec run codegen` before using updated types
- `ARC_EXPLORER_API_URL` and `ARC_RPC_URL` must be set for real data; without them the app shows "Arc data source is not configured yet"
- The `arc-protocols.ts` registry is intentionally empty — do not add placeholder addresses
- Score is only calculated when `dataMode === "full"` (complete explorer history retrieved); RPC-only fallback sets `arcScore: null`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `README.md` for full setup instructions including how to add Arc protocol contracts and a scam-report data source
- `.env.example` lists all environment variables with descriptions
