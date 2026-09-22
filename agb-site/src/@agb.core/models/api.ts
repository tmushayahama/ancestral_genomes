/**
 * Every AGB endpoint answers with the same envelope:
 * `{ success: true, lists: [...] }`, sometimes with `total` or `count`
 * alongside. Endpoints unwrap it in `transformResponse` so nothing downstream
 * ever sees `lists`.
 */
export interface AgbEnvelope<T> {
  success: boolean
  lists: T[]
  /** Present on the gene-list endpoints: the unpaged row count. */
  total?: number
  /** Present on the genome-comparison endpoints: row count after de-duping. */
  count?: number
}

export const unwrapLists = <T>(response: AgbEnvelope<T>): T[] => response?.lists ?? []

export const unwrapFirst = <T>(response: AgbEnvelope<T>): T | undefined => response?.lists?.[0]

/** Rows the API returns as comma-joined strings but that are really lists. */
export const splitList = (value?: string | null): string[] =>
  value
    ? value
        .split(',')
        .map(part => part.trim())
        .filter(Boolean)
    : []
