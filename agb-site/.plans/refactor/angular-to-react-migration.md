# Task: Migrate the Ancestral Genomes site from Angular 6 to React 19 + RTK + Mantine

**Status:** ACTIVE — Phases 0–6 complete, Phase 7 (parity sweep + cutover) outstanding
**Issue:** — (user request, 2026-09-20)
**Branch:** — (repo not initialised yet; user will add git later)

## Goal

Replace the Angular 6 app at `C:/work/panther/panther_agb` with a React SPA in
`C:/work/panther/panther-agb-2/agb-site`, built on the same stack and structure as
`C:/work/go/noctua-visual-pathway-editor` (React 19, Vite, Redux Toolkit + RTK Query, Mantine v9,
Tailwind v4, Vitest/Playwright). "Done" = every user-facing capability of the old site works against
the same API, published URLs still resolve, and the codebase follows this workspace's house
conventions rather than being a literal component-for-component port.

## Context

- **Old app:** `C:/work/panther/panther_agb` — Angular 6.1, Fuse-derived template, 117 `.ts` /
  37 `.html` files. Stateful singleton services + `BehaviorSubject`, `MatTable`/`MatTree`,
  `angular-split`, d3 v3, jQuery, primeng, ngx-translate. Last real commit: PANTHER 14.1 update.
- **Reference stack:** `C:/work/go/noctua-visual-pathway-editor` — the pattern source for layout,
  store wiring, feature-module shape, testing and plan conventions. Its `CLAUDE.md` is the house style.
- **API:** `http://159.89.146.180:3003` — the deployed copy of `C:/work/panther/agb_api_server`
  (Express 4 + Mongoose over `ancGenomesDB15`). Every route answers `{ success, lists, ... }`, and
  every numeric column comes back as a _string_. Not in scope to rewrite; `../agb-api` is reserved
  for it. **Note the port:** the old `environment.ts` says `:3002` and `app.js` says `3003`; only
  `:3003` is live.
- **Triggered by:** user request to migrate the site to React with this workspace's tech stack.

## Current State

**What works now:** every screen of the old site, rebuilt.

- Vite 6 + React 19 + TS project that installs, type-checks, lints, formats, tests and builds clean.
- App shell: `Layout` / `Toolbar` / `Footer`, Mantine theme carrying the old SCSS palette forward.
- Store: `combineSlices` over `species`, `dialog`, `toast`, `loadingOverlay` + one RTK Query
  `apiService`; `loadingOverlayMiddleware` drives the global progress bar off the query lifecycle.
- Full typed API layer — all ten `/genelist/*` endpoints, envelope unwrapping and model
  normalisation in `transformResponse`.
- Routing for every old route, including redirects for the Angular named-outlet URLs.
- Browse view (resizable species tree + gene list), gene detail (page + dialog), species detail
  (page + dialog), genome comparison (four lazy sections), expandable d3 tree, family-tree viewer,
  and the static content pages.
- One shared `DataTable` behind all nine tables in the app.
- 67 unit/component tests across 12 files; 14 hermetic Playwright specs plus 7 live specs
  (`AGB_LIVE=1`) that run against `159.89.146.180:3003` — all passing.

**What's left:** Phase 7 — a full side-by-side parity check against the old site, the `../agb-api`
decision, and deployment configuration.

## Steps

### Phase 0: Initialisation and boilerplate ✅

- [x] Scaffold `agb-site` mirroring the reference repo's config (`vite.config.ts`, three tsconfigs,
      `.eslintrc.json`, `.prettierrc.json`, `.gitattributes`, `.editorconfig`,
      `playwright.config.ts`, `.env.*`). Dev port 4210 to avoid clashing with Noctua's 4202/4208.
- [x] `src/@agb.core/` shared library: `theme/`, `data/` (constants, timescale legend),
      `components/` (dialog, toast, loading overlay, `InfoCard`), `utils/`, `models/api.ts`.
- [x] `src/app/`: `store/apiService.ts`, `store/store.ts`, `hooks.ts`, `layout/`, `routes/`.
- [x] `src/features/{species,genes,comparison,geneTree,pages}/` with models + RTK Query slices.
- [x] Static pages ported from the old templates (content preserved, markup rewritten).
- [x] `tests/setup.ts`, `tests/test-utils.tsx`, `tests/fixtures/`, seed specs; `e2e/smoke.spec.ts`.
- [x] Copy `favicon.ico`, home screenshots, logos and `species-nodes-14.json` into `public/`.
- [x] `README.md`, `CLAUDE.md`, `.plans/template.md` + category folders.

### Phase 1: Species tree and browse shell ✅

- [x] `@agb.core/components/table/DataTable.tsx` — TanStack Table wrapper with filter, sort,
      pagination, row click, CSV export, and loading/error/empty states. Replaces five copies of
      `SpeciesDataSource`.
- [x] `SpeciesTree.tsx` + `SpeciesTreeRow.tsx` — recursive tree off `useGetSpeciesTreeQuery`,
      expanded by default, collapse state in `speciesSlice`, ARIA `tree`/`treeitem` roles.
- [x] `TimescaleLegend.tsx` from `TIMESCALE_LEGEND`.
- [x] `SpeciesBrowserPage` — `react-resizable-panels` split (30/70). Replaces `angular-split` plus
      the named router outlet.
- [x] Active-species highlight and scroll-into-view driven by the `:species` route param, with
      `speciesSlice.activeSpecies` mirroring it for components outside the route.
- [x] Tests: `buildSpeciesTree` nesting/levels/buckets, `speciesSlice` reducers, `SpeciesTree`
      render/collapse/active/dialog/error.

### Phase 2: Gene list ✅

- [x] `GeneListPanel.tsx` — `DataTable` over `useGetGeneListQuery`; column headers switch on whether
      the species is ancestral (i.e. whether it has proxy species).
- [x] Proxy-species `Select` from `useGetProxySpeciesQuery` with `default species` prepended;
      changing it writes `?proxy=` instead of navigating to a new named-outlet URL.
- [x] Debounced filter, page size 50, CSV export, row click → gene dialog.
- [x] Species name in the toolbar opens the species dialog.
- [x] Tests: column labels for ancestral vs extant, proxy read from and written to the query string,
      request URL carries the proxy, row click opens the dialog, gene count in the placeholder.

### Phase 3: Gene detail ✅

- [x] `GeneDetailContent.tsx` — protein name (linked to PANTHER when `leaf_seq_id` is present),
      species, family + family-tree link, reconstructed sequence with a copy button, GO annotation
      table, proxy-gene table. One implementation behind both `GeneDetailPage` and
      `GeneDetailDialog`; the Angular app kept two drifting copies.
- [x] GO annotations load in their own query, skipped entirely for extant genes.
- [x] Tests: ancestral vs extant labelling, sequence cleaning, AmiGO links, no `gene_go` request for
      an extant gene, family-tree link, load failure.

### Phase 4: Species detail ✅

- [x] `SpeciesDetailContent.tsx` — name, gene count linking into the browse view, speciation time,
      NCBI / Tree of Life / Wikipedia links, and for extant species the ancestor list with
      per-ancestor comparison links. Shared by `SpeciesDetailPage` and `SpeciesDetailDialog`.
- [x] Tests: speciation time shown only for ancestral species, ancestors only for extant ones,
      comparison link order, one external link per hyphen-separated clade, load failure.

### Phase 5: Genome comparison ✅

- [x] `GenomeComparisonPage` — Mantine `Accordion`, four sections, each with its own query and its
      own count.
- [x] Four `DataTable` instances with per-section filter and CSV export; columns and export fields
      match the old tables.
- [x] `descentLongIds` renders as a list from the array the slice splits, replacing the
      `<br>`-joined string pushed through `[innerHtml]`.
- [x] Each section's query is gated on first expand; only "inherited" opens by default.
- [x] Tests: descendant vs ancestral counts, id splitting, `NOT_NAMED`, lazy loading, the unmodelled
      section keyed on the extant species alone, species links.

### Phase 6: Expandable species tree ✅

- [x] Rewrote the 637-line d3 v3 + jQuery component against d3 v7: `hierarchy` + `tree` +
      `linkHorizontal` + `zoom`, with React owning the collapsed set and d3 owning the SVG. Dropped
      the unreachable drag-and-drop reordering.
- [x] Left click toggles a node, right click opens the species dialog — same interactions as before.
- [x] Sourced from `useGetSpeciesTreeQuery` rather than the static `species-nodes-14.json`, so the
      view cannot drift from the API.
- [x] Pan/zoom survives a collapse or expand; the tree starts collapsed below depth 2.
- [x] Tests: `toTreeData` shape, synthetic root for multi-root data, colour carry-through; SVG
      rendering covered in Playwright.

### Phase 7: Parity sweep and cutover

- [x] Point every environment at the live API (`http://159.89.146.180:3003`).
- [x] Verify every model assumption against real responses — see **Verified against real data**.
- [x] `e2e/live.spec.ts` (`AGB_LIVE=1`): tree, gene list + filter, proxy picker, gene preview,
      extant species detail, genome comparison, GO-annotation degradation. 7/7 passing.
- [ ] Walk every route side by side against the old site and log any remaining differences here.
- [ ] Decide `../agb-api`: mirror `agb_api_server` as-is, or port it. Two server-side faults are
      worth fixing there first — see **Server-side faults found**.
- [ ] Deployment config (base href, SPA fallback, output path) once the hosting target is known.
- [ ] Retire `panther_agb` (archive the repo, redirect the domain).

## Recovery Checkpoint

> **⚠ UPDATE THIS AFTER EVERY CHANGE**

- **Last completed action:** Phases 1–6 implemented; then corrected against the live API at
  `159.89.146.180:3003` (wire types, `longId`, loading states). `prettier --check` clean,
  `eslint .` clean, `tsc --noEmit` clean, `vitest run` 67/67, `playwright test` 14/14 hermetic,
  `AGB_LIVE=1 playwright test e2e/live.spec.ts` 7/7 live, `npm run build` succeeds.
- **Next immediate action:** Phase 7 — walk each route side by side against the old site and log
  differences; decide what `../agb-api` should be.
- **Recent commands run:**
  - `npm install`
  - `npx playwright install chromium`
  - `npx tsc --noEmit -p tsconfig.app.json`
  - `npx eslint .` / `npx prettier --write .`
  - `npx vitest run`
  - `npx playwright test`
  - `npm run build`
- **Uncommitted changes:** everything — `agb-site` is not a git repo yet. `git init` when convenient.
- **Environment state:** `node_modules` installed; Playwright chromium installed. No dev server
  running. The API is live at `http://159.89.146.180:3003`. Local MongoDB (27017) has **no**
  `ancGenomesDB15` and `agb_api_server/node_modules` is not installed, so there is no local API —
  use the remote. The port 3002 listener on this machine is an unrelated NestJS app; `:3002` on the
  remote is closed.

## Failed Approaches

<!-- Prevent repeating mistakes after context reset -->

| What was tried                                                                                                                                                         | Why it failed                                                                                                                                                                                                                                                                                                                                    | Date       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| Declaring `@typescript-eslint/parser` + `eslint-plugin` at `^7` in `devDependencies` alongside `eslint-config-react-app`.                                              | npm nested a second copy under `eslint-config-react-app`; ESLint 8 refused to start ("couldn't determine the plugin `@typescript-eslint` uniquely"). Removing them and reinstalling clean lets the config's own 5.62.0 hoist, which is what the reference repo relies on. Don't re-add them.                                                     | 2026-09-20 |
| Linting `vite.config.ts` / `playwright.config.ts` with the shared `parserOptions.project`.                                                                             | They are in `tsconfig.node.json`, not `tsconfig.app.json`, so typed linting errored on both. Fixed with an override setting `"project": null` for those two files.                                                                                                                                                                               | 2026-09-20 |
| Naming the `buildSpeciesTree` unit test `tests/features/species/speciesTree.test.ts` while adding a `SpeciesTree.test.tsx` component test in the same folder.          | On a case-insensitive filesystem TypeScript treats the two basenames as one file and silently drops one from the program — the component test was never type-checked, and ESLint failed with "TSConfig does not include this file". Renamed to `buildSpeciesTree.test.ts`. Keep test basenames distinct beyond case.                             | 2026-09-20 |
| Mounting `GlobalDialog` / `GlobalToast` beside `RouterProvider` in `App.tsx` (mirroring the reference repo, whose dialogs contain no links).                           | Dialog content links between routes, so every `<Link>` inside a dialog rendered without router context and the dialog blew up. jsdom tests missed it because `renderWithProviders` wraps everything in a `MemoryRouter`; Playwright caught it. Both hosts now live inside `Layout`, which is the root route element.                             | 2026-09-20 |
| Splitting the API address across environments: host `159.89.146.180` from the old `environment.ts` (which says `:3002`) with port `3003` from `agb_api_server/app.js`. | Neither half was usable on its own — the remote is `159.89.146.180:**3003**`, and `localhost:3003` has no database behind it. Checking `:3002` and concluding "the API is down" wasted a whole pass and produced a set of models guessed from the Angular source instead of read off real responses. Read the live API before typing the models. | 2026-09-20 |
| Typing every numeric API column as `number` (`id`, `timescale`, `gene_count`, `parent_id`, `taxon_id`).                                                                | Mongo stores them as strings and the API passes them straight through, so `gene_count.toLocaleString()` silently returned the raw string and `collapsedIds: number[]` held strings at runtime. There is now a `SpeciesRowWire` type for the wire shape and the slices coerce in `transformResponse`.                                             | 2026-09-20 |
| Reading the gene's PANTHER identifier from `gene.leaf_seq_id`, as the Angular template does.                                                                           | That field does not exist in the API response — the real one is `longId`, and ancestral genes carry the sentinel `NOT_AVAILABE` (sic). The old site's "link the protein name to PANTHER" branch therefore never fired. `pantherGeneId()` handles both spellings of the sentinel.                                                                 | 2026-09-20 |
| Blanking the table on `isFetching` while a query is in flight.                                                                                                         | An uncached gene list takes **8–9 seconds** from the API, so this showed a bare spinner with no context for that long, and it also flashed on every cached refetch. Now `isLoading` (first load only) drives the blank state, with a `loadingMessage` explaining the wait; section counts show `…` rather than `0` until they are known.         | 2026-09-20 |
| Planning to virtualise the gene list with `@tanstack/react-virtual`.                                                                                                   | Redundant: the table paginates, so at most 100 rows are ever in the DOM. Dependency removed. If a species is slow it will be the client-side filter over the full array, and the fix is server-side filtering in the API, not virtualisation.                                                                                                    | 2026-09-20 |

## Files Modified

Everything under `agb-site/` is new. Grouped rather than listed file by file:

| File                                                                                                                                                                                      | Action | Status |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ |
| `package.json`, `vite.config.ts`, `tsconfig*.json`, `.eslintrc.json`, `.prettierrc.json`, `.env.*`, `playwright.config.ts`, `index.html`, `.gitignore`, `.gitattributes`, `.editorconfig` | create | done   |
| `src/App.tsx`, `src/main.tsx`, `src/index.css`, `src/styles/app-base.css`, `src/vite-env.d.ts`                                                                                            | create | done   |
| `src/app/{store/apiService.ts,store/store.ts,hooks.ts}`                                                                                                                                   | create | done   |
| `src/app/layout/{Layout,Toolbar,Footer}.tsx`                                                                                                                                              | create | done   |
| `src/app/routes/{routes.tsx,LegacyRedirects.tsx}`                                                                                                                                         | create | done   |
| `src/@agb.core/theme/{palette.ts,mantineTheme.ts}`                                                                                                                                        | create | done   |
| `src/@agb.core/data/{constants.ts,timescale.ts}`                                                                                                                                          | create | done   |
| `src/@agb.core/components/{dialog,toast,loading-overlay,card,table}/*`                                                                                                                    | create | done   |
| `src/@agb.core/{utils/csv.ts,utils/text.ts,models/api.ts}`                                                                                                                                | create | done   |
| `src/features/species/{models,slices,components}/*` — tree, row, legend, browser, detail content/page/dialog, expandable tree + page                                                      | create | done   |
| `src/features/genes/{models,slices,components}/*` — list panel, detail content/page/dialog                                                                                                | create | done   |
| `src/features/comparison/{models,slices,components}/*` — page, section, columns                                                                                                           | create | done   |
| `src/features/geneTree/components/GeneTreePage.tsx`                                                                                                                                       | create | done   |
| `src/features/pages/components/*` (9 files), `data/releaseInfo.ts`                                                                                                                        | create | done   |
| `tests/` — setup, `test-utils.tsx`, `fixtures/{builders.ts,apiStub.ts}`, 10 spec files                                                                                                    | create | done   |
| `e2e/` — `fixtures/api.ts`, `smoke.spec.ts`, `browse.spec.ts`, `comparison.spec.ts`                                                                                                       | create | done   |
| `README.md`, `CLAUDE.md`, `.plans/template.md`                                                                                                                                            | create | done   |

## Blockers

- ~~No reachable API.~~ Resolved: the API is at `http://159.89.146.180:3003` (port 3003, not the
  3002 in the old `environment.ts`). All environments now point at it.
- **`/genelist/gene_go/:ptn` is down**, so the GO annotation table is empty on the live site. Needs
  an API fix — see **Server-side faults found**.
- **Hosting target for the React build is unknown** (the old site was an `ng build` into `dist/`
  behind whatever serves ancestralgenomes.org). Affects `VITE_BASE_URL` and the SPA fallback rule.

## Verified against real data

Checked against `http://159.89.146.180:3003` on 2026-09-20. Everything here was an assumption in the
first pass; these are now measurements.

**Confirmed**

1. **"Ancestral" is inferred from having proxy species.** `/genelist/proxy_species/HUMAN` returns
   `[]`; `/genelist/proxy_species/LUCA` returns ~90 extant species. The inference holds.
2. **`all_ancestors` elements are `[mya, shortName]`**, e.g. `["6.65", "Homo-Pan"]`. Both are
   strings and the age can be fractional. The field is present on _every_ row, including
   `species-list` rows and ancestral species (LUCA's is `[]`, but Actinomycetales has four).
3. **The comparison endpoints accept either name for the extant species** —
   `gene-pass/Homo-Pan/HUMAN` and `gene-pass/Homo-Pan/Homo%20sapiens` both return `count: 18770`.
   So building the link from `long_name`, as the old template did, is safe.
4. **`descent_*` comma-splitting is safe.** Across all 17,781 rows of
   `gene-pass/Eutheria/Homo sapiens`, the `descent_ptns` and `descent_gnames` element counts match
   exactly — no protein name contains a comma.
5. **The root really is `parent_id: ""`** (empty string, not null).

**Corrected**

6. **Every numeric column is a string** on the wire: `id`, `taxon_id`, `parent_id`, `timescale`,
   `gene_count`. Rows also carry `parent_short_name`, which the first pass missed.
7. **`total` on the gene list is a number** (`3018`), not the full row array. The earlier note
   claiming the result set was sent twice was wrong — it came from reading the Angular code
   (`totalGenes.length`), which means the old site's gene count was `undefined`.
8. **The gene's PANTHER id is `longId`, not `leaf_seq_id`**, with `NOT_AVAILABE` (sic) as the
   sentinel for ancestral genes.
9. **`proxy_genes` entries carry `proxy_spe_short` as well as `proxy_spe_long` and `proxy_gene`.**
10. **The "unnamed protein" sentinel is `"NOT NAMED"`, not `"1"`.** `displayProteinName` still maps
    `'1'` because the old `replace` pipe did, but it never fires on current data.
11. **Gene responses also carry `_id`, `direct_paint_annotations` and `inherited_paint_annotations`**
    (all empty in the rows sampled). The separate `gene_go` endpoint is what actually populates GO
    annotations.

**Measured**

12. **Cold gene-list requests take 8–9 seconds**; the API's `apicache` then serves the same URL in
    ~0.24s for two hours. Every species/proxy pair has its own cold cost. This drives the
    `loadingMessage` and the `…` placeholders rather than `0` counts.
13. **`species-list` is ~230 KB** (111 species, each with its full `all_ancestors` chain) and
    **a species gene list is ~0.5 MB**. Both are fine to hold client-side.

## Server-side faults found

Both belong in `../agb-api`, not in the client:

1. **`/genelist/gene_go/:ptn` is broken for every gene.** It closes the connection without replying
   (curl exit 52, "empty reply from server"). Cause: it scrapes
   `pantree.org/node/annotationNode.jsp`, which now answers **403**, and the handler does
   `html.split('Direct Annotations to this node')[1].split(...)` without guarding — so it throws on
   `undefined` and the response is never sent. The client degrades to an explicit "GO annotations
   are unavailable" message instead of an endless spinner, but the GO annotation table is empty on
   the live site until the API is fixed.
2. **`[...new Set(lists)]`** over Mongoose documents de-dupes by object identity, so it never
   removes anything. If duplicates are real, they are still being returned.

## Notes

**Routing.** Old plain-path URLs are kept verbatim (`/genes/:ptn`, `/genes/gene-tree/:pthr/:ptn`,
`/genes/genome-comparison/:extant/:ancestral`), so external links and citation-era bookmarks keep
working. The one URL that cannot survive is the Angular named outlet
`/species/genes/(list:genes/LUCA/default species)` — that syntax is Angular-router-specific and puts
a space inside a path segment. `LegacyRedirects.tsx` parses it and redirects to
`/species/LUCA?proxy=default%20species`. Old `/species/:id` detail URLs now land on the browse view
for that species rather than 404ing, with the full detail at `/species/:species/info`.

**State management.** The split is deliberate and is the main structural change from the Angular app:

- The three Angular services were _simultaneously_ HTTP clients, mutable caches and event buses
  (`ancestralGenes`, `totalGenesCount`, `onSpeciesChanged.next(...)`). Every one of those
  responsibilities belongs to RTK Query, so they collapse into endpoints on a single `apiService`.
- What is genuinely client state — active species, tree collapse, which dialog is open, toast, the
  progress bar — lives in plain slices, and only that.
- Response shaping happens once in `transformResponse`, not in each component. `GenesService`
  mutated its own response rows in place (`descent_ptns.replace(/,/g, '<br>')`) and the template
  then rendered them with `[innerHtml]`; the slice splits them into arrays instead.

**A race fixed by construction.** In the old comparison page, the four child tables each fetched and
wrote counts onto shared `GenesService` fields while the parent read them off `onSpeciesChanged` —
the header numbers depended on response order. Each section now owns its own query and count.

**Deliberate behaviour changes** (all small, all visible; flag any that are unwanted):

- The proxy-species picker moved from inside the `proxy_gene` column header to the table toolbar;
  the help tooltip moved with it. The column header now names the selected species.
- The gene list is fetched once, not twice. The old page fetched page 1 and then the whole list and
  threw the first response away.
- Selecting a different species clears `?proxy=`, because proxies are per-species.
- Comparison sections load on first expand rather than all four on mount.
- The protein sequence is a scrollable `<pre>` with a copy button rather than a read-only
  `<textarea>` whose contents were indented by the template.
- The expandable tree starts collapsed below depth 2 instead of fully collapsed.

**Being dropped, deliberately.** Flag any of these if they are actually wanted:

- `species-vertical-tree`, `species-horizontal-tree` — routed but unlinked experiments (the
  home-page and menu links to them are commented out). They redirect to `/species`.
- `@noctua.search` search bar, `quick-panel`, `material-color-picker`, `widget` — dead Fuse template
  code; the search bar was rendered under `*ngIf="false"`.
- ngx-translate — only ever had an `en` bundle and two stub `tr` files.
- `BreadcrumbsService` — written to by three components, read by a toolbar that never rendered it.
- `AppDataLoader` — a stub that `console.log`s its response.
- jQuery, hammerjs, perfect-scrollbar, primeng, `angular-tree-component`, `ngx-charts`, `ngx-graph`,
  moment, lodash — replaced by platform APIs or not needed.

**Dependency choices beyond the reference stack.** The reference app has no tables and no trees, so
there are two additions: `@tanstack/react-table` (nine tables in this app all want the same
filter/sort/paginate/export behaviour) and `react-resizable-panels` (replaces `angular-split`). `d3`
stays but moves v3 → v7. `@molteni/export-csv` is replaced by ~30 lines in
`@agb.core/utils/csv.ts`.

**Testing without the API.** `tests/fixtures/apiStub.ts` stubs `fetch` and `e2e/fixtures/api.ts`
stubs via `page.route`, both with real-shaped envelopes, so component tests exercise the actual
slices and `transformResponse`. What they cannot catch is a wrong assumption about the _content_ of
a real response — see **Needs checking against real data**.

## Lessons Learned

- Reading the old _services_ before the old _components_ was the right order: the components are
  Fuse boilerplate with a few bindings, while the services encode the actual data contract and all
  its quirks (the `{ success, lists }` envelope, `total` being an array, the `<br>` munging).
- Mirroring the reference repo's `.eslintrc.json` only works if its dependency list is mirrored too —
  adding the "obviously missing" `@typescript-eslint` packages broke the install.
- The provider tree is the one thing jsdom tests systematically cannot check, because the test
  harness supplies its own providers. The `GlobalDialog`-outside-the-router bug was invisible to 67
  passing unit tests and obvious on the first Playwright run. Keep at least one e2e path through
  every globally mounted component.
- Case-only filename differences are silently destructive on Windows. ESLint's "TSConfig does not
  include this file" was the only symptom.

## Additional Context (Claude)

**Risks and things worth deciding early**

1. **Gene-list size is not the bottleneck; the cold API request is.** A 3,018-row LUCA list is
   0.5 MB and renders instantly once it arrives, but the first uncached request takes 8–9s.
   Client-side filter/sort/export over the full set is therefore fine; what would help is warming
   or persisting the API's cache, not paging in the client.
2. **`gene_go` is currently broken**, not merely slow — pantree.org answers 403 and the unguarded
   scrape kills the response. Fixing it in `agb-api` (guard the parse, and prefer GOlr over
   scraping) is the single highest-value API change.
3. **Mixed-content risk.** `VITE_AGB_API_URL` and the gene-tree iframe are both plain `http://`. If
   the new site is served over HTTPS, browsers will block both. This needs answering before cutover,
   and it is an API/hosting change rather than a front-end one.
4. **Hard-coded release numbers.** `RELEASE_INFO` still needs a code change each PANTHER release. If
   the API can report them (the counts are derivable from the collections), that page should read
   them instead.

**Alternatives considered**

- _Incremental strangler migration_ (React islands inside the Angular shell): rejected. Angular 6 is
  five majors behind, the build does not run on a modern toolchain without work, and the app is small
  enough (~15 real screens) that a clean rewrite is cheaper than maintaining a bridge.
- _Mantine `Tree` for the species hierarchy_: rejected in favour of a recursive row component. The
  row needs a timescale swatch, a right-aligned gene count and a hover action button, which fight
  Mantine's `renderNode` slot; the recursive version is ~120 lines and fully controlled.
- _Keeping ESLint 8 / `eslint-config-react-app`_: matched to the reference repo on purpose, so a
  developer moving between the two gets identical lint behaviour. Both are EOL, though — worth a
  coordinated bump to ESLint 9 flat config across both repos, as a separate task.

**Observations on the API worth carrying into `agb-api`**

- `/genelist/species/:species` returns `total` as the _full row array_, purely so the client can read
  `.length` off it. That is the whole result set sent twice. The React client ignores it.
- `getGeneLoss` / `getGenePassed` take `(anc, ext)` in the service and the routes read
  `:anspecies/:exspecies`, but `getGeneGains` is called `(ext, anc)` and swaps them internally. The
  React slices normalise on `{ ancestralSpecies, extantSpecies }` so this cannot be got wrong at a
  call site — the API's own naming is still inconsistent, though.
- `species-list` returns the root with `parent_id: ''` (empty string, not null), which is what
  `buildSpeciesTree` keys on. A change to `null` there would silently produce an empty tree.
- Every numeric column is a string. Fixing that in the API would be a breaking change for any other
  consumer, so the client coerces instead.
- The two faults under **Server-side faults found** are the highest-value things to fix in
  `../agb-api`; the broken `gene_go` scrape is user-visible today.
