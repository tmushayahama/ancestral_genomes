import { vi } from 'vitest'

/**
 * Payload for one route, in the shape the AGB API actually returns.
 * Keys are matched as substrings of the request path, longest first, so
 * `'/genelist/species/LUCA/default species'` beats `'/genelist/species'`.
 */
export type RouteStubs = Record<string, unknown>

export interface StubOptions {
  /** Paths (matched the same way) that should answer 500 instead. */
  failing?: string[]
}

/**
 * Stubs `fetch` for RTK Query. Component tests exercise the real slices —
 * including `transformResponse`, which is where most of the migration's data
 * normalisation lives — rather than preloading already-shaped state.
 */
export const stubAgbApi = (routes: RouteStubs, { failing = [] }: StubOptions = {}) => {
  const keys = Object.keys(routes).sort((a, b) => b.length - a.length)

  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = decodeURIComponent(
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    )

    if (failing.some(path => url.includes(path))) {
      return new Response('{"success":false}', {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const key = keys.find(candidate => url.includes(candidate))

    if (key === undefined) {
      throw new Error(`No API stub for ${url}. Stubbed: ${keys.join(', ') || '(none)'}`)
    }

    return new Response(JSON.stringify(routes[key]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  })

  vi.stubGlobal('fetch', fetchMock)

  return fetchMock
}

/**
 * Decoded URLs a stubbed fetch was called with. `fetchBaseQuery` passes a
 * `Request`, not a string, so reading `mock.calls` directly gives
 * `[object Request]`.
 */
export const requestedUrls = (fetchMock: ReturnType<typeof stubAgbApi>): string[] =>
  fetchMock.mock.calls.map(([input]) =>
    decodeURIComponent(
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    )
  )

/** Wraps rows in the `{ success, lists }` envelope every endpoint uses. */
export const envelope = <T>(lists: T[], extra: Record<string, unknown> = {}) => ({
  success: true,
  lists,
  ...extra,
})
