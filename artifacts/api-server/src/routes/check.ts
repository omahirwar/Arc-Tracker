import { Router } from "express";
import { isAddress } from "viem";
import { checkRateLimit } from "../lib/rate-limiter.js";
import { walletCache } from "../lib/cache.js";
import { fetchWalletActivity } from "../lib/arc-fetcher.js";
import { logger } from "../lib/logger.js";

const router = Router();

router.get("/check", async (req, res) => {
  const address = req.query["address"];

  if (typeof address !== "string" || !address.trim()) {
    res.status(400).json({ error: "Please enter a valid EVM wallet address." });
    return;
  }

  const normalized = address.trim();

  if (!isAddress(normalized)) {
    res.status(400).json({ error: "Please enter a valid EVM wallet address." });
    return;
  }

  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
    req.socket?.remoteAddress ??
    "unknown";

  const rateResult = checkRateLimit(ip);

  if (!rateResult.allowed) {
    res.status(429).json({
      error: "Too many requests. Please wait a moment and try again.",
      code: "RATE_LIMITED",
    });
    return;
  }

  const cacheKey = normalized.toLowerCase();
  const cached = walletCache.get(cacheKey);

  if (cached) {
    res.setHeader("X-Cache", "HIT");
    res.json(cached);
    return;
  }

  try {
    const result = await fetchWalletActivity(normalized);

    if (result.dataMode !== "unavailable") {
      walletCache.set(cacheKey, result);
    }

    res.setHeader("X-Cache", "MISS");
    res.json(result);
  } catch (err: unknown) {
    const e = err as Error & { code?: string };
    logger.warn({ err: e }, "Arc fetch error");

    if (e.code === "INVALID_ADDRESS") {
      res.status(400).json({ error: e.message, code: "INVALID_ADDRESS" });
      return;
    }

    res.status(503).json({
      error: "Unable to fetch Arc explorer data right now. Please try again later.",
      code: "FETCH_ERROR",
    });
  }
});

export default router;
