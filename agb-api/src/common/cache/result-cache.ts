export interface ResultCacheOptions {
  ttlMs: number;
  maxEntries: number;
  /** Budget in rows: a page weighs its `items.length`, anything else 1. */
  maxRows: number;
  now?: () => number;
}

interface Entry {
  value: unknown;
  expiresAt: number;
  weight: number;
}

/**
 * In-process LRU cache for query results, shared by REST and GraphQL.
 *
 * It replaces the legacy `apicache`, which cached serialised HTTP responses
 * without bound and lost everything whenever the process restarted. Two
 * properties matter here:
 *
 * - **In-flight de-duplication.** Concurrent requests for the same cold key
 *   share one database query instead of each paying the full cost.
 * - **A row budget as well as an entry cap.** One WHEAT gene list is 102,802
 *   rows, so an entry count alone does not bound memory.
 *
 * Cached values are shared between callers and must be treated as immutable.
 * Failed loads are not cached.
 */
export class ResultCache {
  private readonly entries = new Map<string, Entry>();
  private readonly pending = new Map<string, Promise<unknown>>();
  private rows = 0;
  private readonly now: () => number;

  constructor(private readonly options: ResultCacheOptions) {
    this.now = options.now ?? Date.now;
  }

  async wrap<T>(key: string, load: () => Promise<T>): Promise<T> {
    const entry = this.entries.get(key);
    if (entry) {
      if (entry.expiresAt > this.now()) {
        // Re-insert to mark as most recently used.
        this.entries.delete(key);
        this.entries.set(key, entry);
        return entry.value as T;
      }
      this.remove(key);
    }

    const inFlight = this.pending.get(key);
    if (inFlight) {
      return inFlight as Promise<T>;
    }

    const promise = load()
      .then((value) => {
        this.store(key, value);
        return value;
      })
      .finally(() => this.pending.delete(key));
    this.pending.set(key, promise);
    return promise;
  }

  clear(): void {
    this.entries.clear();
    this.rows = 0;
  }

  stats(): { entries: number; rows: number } {
    return { entries: this.entries.size, rows: this.rows };
  }

  private store(key: string, value: unknown): void {
    const { ttlMs, maxEntries, maxRows } = this.options;
    const weight = weigh(value);
    if (ttlMs <= 0 || maxEntries <= 0 || weight > maxRows) {
      return;
    }
    this.remove(key);
    this.entries.set(key, { value, expiresAt: this.now() + ttlMs, weight });
    this.rows += weight;
    while (this.entries.size > maxEntries || this.rows > maxRows) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) {
        break;
      }
      this.remove(oldest);
    }
  }

  private remove(key: string): void {
    const entry = this.entries.get(key);
    if (entry) {
      this.rows -= entry.weight;
      this.entries.delete(key);
    }
  }
}

function weigh(value: unknown): number {
  if (Array.isArray(value)) {
    return Math.max(1, value.length);
  }
  if (value !== null && typeof value === 'object') {
    const items = (value as { items?: unknown }).items;
    if (Array.isArray(items)) {
      return Math.max(1, items.length);
    }
  }
  return 1;
}
