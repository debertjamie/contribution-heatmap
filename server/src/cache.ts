/**
 * In-memory TTL cache for contribution results.
 *
 * Keyed by `${username}:${year}`. Uses a plain Map with per-entry expiry
 * timestamps and lazy expiry (expiry is checked on read, no background timer),
 * which keeps the implementation simple and avoids open handles in tests.
 */

import type { ContributionsResult } from './github.js';

interface CacheEntry {
  value: ContributionsResult;
  expires: number;
}

const store = new Map<string, CacheEntry>();

/** Default TTL (ms) when CACHE_TTL_MS is unset. */
const DEFAULT_TTL_MS = 600000;

function ttlMs(): number {
  const raw = Number(process.env.CACHE_TTL_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TTL_MS;
}

/**
 * Return the cached result for `key`, or `undefined` when absent or expired.
 * Expired entries are deleted lazily on read.
 */
export function getCached(key: string): ContributionsResult | undefined {
  const entry = store.get(key);
  if (!entry) {
    return undefined;
  }
  if (Date.now() >= entry.expires) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

/** Store `value` under `key` with an expiry of now + CACHE_TTL_MS. */
export function setCached(key: string, value: ContributionsResult): void {
  store.set(key, { value, expires: Date.now() + ttlMs() });
}

/** Clear the entire cache (used by tests). */
export function clearCache(): void {
  store.clear();
}
