# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ancestral Genomes (AGB) — a React 19 + TypeScript SPA for browsing reconstructed ancestral genomes
and protein-coding genes across the tree of life. Built with Vite, Tailwind CSS v4, Redux Toolkit
and Mantine v9.

It is a rewrite of the Angular 6 app at `C:/work/panther/panther_agb`, which remains the behavioural
reference while the migration is in flight. Its data comes from the AGB Express/Mongo service
(`C:/work/panther/agb_api_server`), deployed at **`http://159.89.146.180:3003`** — port 3003, not
the `:3002` the old `environment.ts` names.

## Commands

- `npm run dev` — dev server on port **4210** (set in `vite.config.ts`)
- `npm run start` — dev server on port 4210, host `0.0.0.0`, `development` mode (variants:
  `start:development`, `start:staging`, `start:production`)
- `npm run build` — `tsc -b` then `vite build --mode production`
- `npm test` — Vitest run (looks for `tests/**/*.test.{ts,tsx}` only — files outside `tests/` are ignored)
- Run a single test file: `npx vitest run tests/features/species/speciesTree.test.ts`
- `npm run test:e2e` — Playwright (`test:e2e:ui`, `test:e2e:headed` variants)
- `npm run lint` / `lint:fix` — ESLint
- `npm run format` — Prettier
- `npm run type-check` — `tsc --noEmit -p tsconfig.app.json`

Environment modes: `development`, `staging`, `production` (via `--mode`). Env files
`.env.development`, `.env.staging`, `.env.production`. All runtime vars must be prefixed `VITE_`.
`VITE_AGB_API_URL` is the API base; `VITE_OUTPUT_PATH` overrides the build output directory.

## Architecture

### Source Layout

- `src/@agb.core/` — shared library: reusable components (`dialog`, `toast`, `loading-overlay`,
  `card`, `table`), theme, constants, utilities. Components that need state own their slice next to
  themselves (`dialogSlice`, `toastSlice`, `loadingOverlaySlice`). `DataTable` is the single table
  used by every list in the app — filter, sort, paginate, row click and CSV export.
- `src/app/` — app shell: store setup (`app/store/store.ts`), typed hooks (`app/hooks.ts`), layout
  (`Layout`, `Toolbar`, `Footer`), routing (`app/routes/`).
- `src/features/` — self-contained feature modules (`components`, `models`, `slices`, `hooks`,
  `data`):
  - `species/` — species tree, browse view, species detail
  - `genes/` — gene list for a species, gene detail, proxy genes, GO annotations
  - `comparison/` — ancestral vs extant genome comparison (inherited / lost / gained / unmodelled)
  - `geneTree/` — embedded PANTHER family-tree viewer
  - `pages/` — static content pages (home, about, contact, downloads, legal)
- `tests/` — Vitest specs mirroring `src/` paths; fixture builders in `tests/fixtures/`; shared
  `renderWithProviders` in `tests/test-utils.tsx`; jsdom stubs in `tests/setup.ts`.
- `e2e/` — Playwright specs.

### State Management

Redux Toolkit with `combineSlices`. Two kinds of state, kept strictly apart:

- **Server data → RTK Query.** One `apiService` (`src/app/store/apiService.ts`) that feature slices
  extend with `injectEndpoints`, so every feature shares one cache, one reducer and one middleware
  entry. This replaces the Angular services (`GenesService`, `SpeciesService`, `GeneService`), which
  held their last response in mutable fields and notified via `BehaviorSubject`.
- **Client state → plain slices.** `speciesSlice` (active species, tree view, collapsed nodes),
  `dialogSlice`, `toastSlice`, `loadingOverlaySlice`.

Endpoints normalise in `transformResponse`: the `{ success, lists }` envelope is unwrapped there,
and comma-joined string columns are split into arrays, so no component ever sees the wire shape.

Custom middleware: `loadingOverlayMiddleware` ties the RTK Query lifecycle to the global progress
bar, so features never toggle it by hand.

### API Layer

The AGB service exposes `/genelist/*` and always answers `{ success, lists, ... }`. **Every numeric
column arrives as a string** (`id`, `taxon_id`, `parent_id`, `timescale`, `gene_count`), so each
feature has a `*Wire` type for the response and a parsed model for components; the coercion happens
in `transformResponse` and nowhere else.

| Endpoint                                   | Used by                          |
| ------------------------------------------ | -------------------------------- |
| `/genelist/species-list/`                  | species tree                     |
| `/genelist/species-info/:species`          | species detail                   |
| `/genelist/species/:species/:proxySpecies` | gene list                        |
| `/genelist/proxy_species/:species`         | proxy-species picker             |
| `/genelist/gene/:ptn`                      | gene detail                      |
| `/genelist/gene_go/:ptn`                   | GO annotations (scrapes pantree) |
| `/genelist/gene-pass/:anc/:ext`            | inherited genes                  |
| `/genelist/gene-loss/:anc/:ext`            | lost genes                       |
| `/genelist/gene-gain/:anc/:ext`            | gained genes                     |
| `/genelist/gene-no-model/:ext`             | unmodelled genes                 |

Two things to know before debugging against it:

- **A cold request for a gene list or a comparison takes 8–9 seconds**; the API's `apicache` then
  serves it in ~0.2s for two hours. Loading states carry a message saying so, and section counts
  render `…` rather than `0` until they resolve.
- **`/genelist/gene_go/:ptn` is broken server-side** — it scrapes pantree.org, which now returns
  403, and the unguarded parse kills the response before it is sent. The GO annotation card shows an
  explicit "unavailable" message. Don't chase this in the client.

### Routing

React Router 7. Old Angular URLs are preserved where they were plain paths (`/genes/:ptn`,
`/genes/gene-tree/:pthr/:ptn`, `/genes/genome-comparison/:extant/:ancestral`). The named-outlet URL
`/species/genes/(list:genes/X/Y)` is Angular-only syntax, so `src/app/routes/LegacyRedirects.tsx`
translates it to `/species/X?proxy=Y`. Don't delete those redirects — they are in published links.

## Enforced Patterns

- **Typed Redux hooks only** — import `useAppDispatch`/`useAppSelector` from `src/app/hooks.ts`.
  Direct `useSelector`/`useDispatch`/`useStore` from `react-redux` are lint errors.
- **`import type`** for type-only imports (`@typescript-eslint/consistent-type-imports`).
- **Path alias** — `@/*` for `src/*`, `@tests/*` for `tests/*`.
- **UI library** — Mantine v9 for components (Modal, Button, Input, Table primitives); Tailwind for
  layout and utility styling. Prefer the wrappers in `src/@agb.core/components/` over raw Mantine so
  sizing and scroll behaviour stay consistent.
- **Dialogs** — dispatch `openDialog({ component: DialogComponent.X, customProps })`; never mount a
  `<Modal>` inside a feature. `GlobalDialog` maps the enum to the component, and is mounted inside
  `Layout` (not beside `RouterProvider`) because dialog content links between routes.
- **Detail views** — a `*DetailContent` component holds the body, and the page and the dialog both
  render it. Don't fork the markup; the Angular app did and the two copies drifted.
- **Tables** — build a `ColumnDef[]` and hand it to `DataTable` rather than writing table markup.
- **Loading flags** — pass RTK Query's `isLoading` (first load for that cache key), not `isFetching`,
  to anything that blanks the UI; `isFetching` flashes on every cached refetch.
- **Unused parameters** — prefix with `_` to satisfy ESLint.
- `vite.config.ts` and `playwright.config.ts` are linted without type-aware rules (they are covered
  by `tsconfig.node.json`, not `tsconfig.app.json`).

## Conventions

- Prettier: no semicolons, single quotes, 2-space indent, trailing comma `es5`, 100-char width,
  `arrowParens: avoid`. Tailwind classes are auto-sorted by `prettier-plugin-tailwindcss`.
- Naming: PascalCase for components, camelCase for hooks and utilities.
- Model files own their derived logic (`cleanSequence`, `isAncestral`, `displayProteinName`) rather
  than repeating it in components — the Angular app duplicated all three across several templates.

## Testing

Vitest + React Testing Library + jsdom. Use `renderWithProviders` from `tests/test-utils.tsx` to
render with an isolated store, the app theme and a `MemoryRouter` (accepts `preloadedState`, `store`
and `routes`). Fixture builders live in `tests/fixtures/builders.ts` — prefer them over hand-rolled
models.

The AGB API is a separate service, so both suites stub it rather than preloading shaped state:
`stubAgbApi` in `tests/fixtures/apiStub.ts` (stubs `fetch`) and `e2e/fixtures/api.ts` (stubs via
`page.route`). Both serve real-shaped `{ success, lists }` envelopes, so `transformResponse` and the
slices stay on the tested path. `requestedUrls(fetchMock)` decodes what was requested —
`fetchBaseQuery` passes a `Request`, so reading `mock.calls` directly gives `[object Request]`.

Two things unit tests here cannot catch, both learned the hard way:

- **Provider-tree bugs.** `renderWithProviders` supplies its own router, so a component mounted
  outside the real router still passes. Keep at least one Playwright path through every globally
  mounted component.
- **Case-only filename collisions.** On Windows, `speciesTree.test.ts` and `SpeciesTree.test.tsx` in
  one folder are the same file to TypeScript, and one is silently dropped from the program. Keep
  test basenames distinct beyond case.

## Task Management

Create and maintain plan files in `.plans/<category>/<task-name>.md` for non-trivial work. See
[.plans/template.md](.plans/template.md) for the full template, the recovery-checkpoint convention
and the category folders (`bugfix`, `feature`, `refactor`, `config`, `docs`, `testing`, `misc`).

The migration itself is tracked in
[.plans/refactor/angular-to-react-migration.md](.plans/refactor/angular-to-react-migration.md).

## Git Commits

- **Never** add `Co-Authored-By: Claude ...` trailers (or any Claude attribution) to commit messages.
- Keep messages short: a one-line subject plus a few brief bullets, not paragraphs.
