/** Every collection the API returns, over REST and GraphQL alike. */
export interface Page<T> {
  total: number;
  offset: number;
  /** `null` when every row was requested. */
  limit: number | null;
  items: T[];
}

export interface PageRequest {
  offset: number;
  /** `null` means every row. */
  limit: number | null;
}

export const ALL_ROWS: PageRequest = { offset: 0, limit: null };

export function toPage<T>(
  items: T[],
  total: number,
  request: PageRequest,
): Page<T> {
  return { total, offset: request.offset, limit: request.limit, items };
}

/** The whole of an in-memory list as a page. */
export function wholePage<T>(items: T[]): Page<T> {
  return toPage(items, items.length, ALL_ROWS);
}

/** Stable cache-key fragment for a page request. */
export function pageKey(request: PageRequest): string {
  return `${request.offset}:${request.limit ?? 'all'}`;
}
