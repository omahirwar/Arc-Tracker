/**
 * In-memory cache with TTL.
 * Caches successful wallet check results for 5 minutes to reduce RPC/API load.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const TTL_MS = 5 * 60_000; // 5 minutes

class Cache<T> {
  private store = new Map<string, CacheEntry<T>>();

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: T, ttlMs = TTL_MS): void {
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  delete(key: string): void {
    this.store.delete(key);
  }
}

export const walletCache = new Cache<unknown>();
