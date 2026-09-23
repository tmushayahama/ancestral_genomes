# Task: Port agb_api_server (Express 4 + Mongoose 4) to a NestJS 11 REST + GraphQL API in agb-api

**Status:** ACTIVE — Phases 1–6 are complete; everything runs against fixtures. Phases 0 and 7 are
blocked until a database dump is available; Phase 9 is waiting on decision 4.
**Issue:** — (user request, 2026-09-22)
**Branch:** `main` of `panther-agb-2` (agb-api committed in 12 commits from `fedf7b1`)

## Goal

Replace `C:/work/panther/agb_api_server` with a NestJS service in
`C:/work/panther/panther-agb-2/agb-api`, built on the stack and conventions of
`C:/work/panther/annotations/go-pango-annotations-trials/c-api`.

**The API is the source of truth.** It gets a clean, typed contract of its own, served over both
REST (`/api/*`) and GraphQL (`/graphql`) from one set of services. `../agb-site` will be changed to
follow it in a later, separate task.

"Done" means:

- every capability of the legacy API is available, returning the same _data_: the same genes and
  counts, apart from the documented bug fixes
- every legacy fault listed below is fixed
- the service is tested, configured, observed, documented and deployable

## Context

- **Legacy API.** `C:/work/panther/agb_api_server`:
  - stack: Express 4.15, Mongoose 4.11, `apicache`, `request` (deprecated), and `cheerio` (imported
    but never used)
  - 12 routes in one 340-line router (`controllers/genelist.js`), over five models
  - hard-coded port `3003` and hard-coded `mongodb://localhost:27017/ancGenomesDB15`
  - live at `http://159.89.146.180:3003`, where the site still points
- **Template.** `c-api`:
  - NestJS 11.1, with GraphQL (Apollo) plus REST
  - `@nestjs/mongoose` 11 with Mongoose 9.2 (MongoDB driver 7.1)
  - a Joi-validated `ConfigService` and a custom `WinstonModule`
  - Swagger, Jest 29 + ts-jest + supertest, ESLint 10 (flat config) + Prettier
  - a `nestjs-command` CLI and Docker
  - `CLAUDE.md`, `.plans/` and `.claude/settings.local.json`

  Node 20.19.5 is installed.
- **Consumer.** `../agb-site` (React 19 + RTK Query) still calls the legacy `/genelist/*` routes on
  the live server. **It is not modified in this task.** Once the new API has data, it moves to the
  new contract in its own task.
- **Triggered by.** A user request on 2026-09-22, plus two follow-ups the same day:
  1. "c-api is the boilerplate; port agb_api_server into agb-api; don't touch the site; plan first."
  2. GraphQL wanted; Firebase dropped.
  3. "The site will change according to the API; the API is king. I don't have the data yet. Fix the
     bugs, no authentication, start implementing."
- **Plan format.** `.plans/template.md`, copied verbatim from `../agb-site/.plans/template.md`.

## Decisions

All of these were settled by the user on 2026-09-22 unless marked as a default.

1. **✅ REST + GraphQL over the same services, with no authentication.** Everything from the template
   that exists for users goes: Firebase, passport, JWT, access control. So do Elasticsearch and the
   pagination plugin. Each transport covers what it is good at:
   - **REST** carries bulk lists and cacheable `GET`s.
   - **GraphQL** carries nested lookups and field selection.
2. **✅ The API is king. There is no frozen `/genelist` wire format and no compatibility layer.** The
   new contract is typed and cleaned up:
   - real numbers instead of numeric strings
   - `null` instead of sentinels
   - arrays instead of comma-joined strings
   - camelCase field names
   - proper HTTP status codes

   The legacy table below stays only as the reference for what the data _means_.
3. **✅ Fix every legacy bug** (see **Faults**). One of these fixes changes results: F3 changes which
   genes gene-gain returns, and it is deliberate.
4. **GO annotations: the source is still open** (default applies until decided). pantree.org is gone
   (403 on every URL, checked 2026-09-22), so the scrape is not ported at all.
   - `PAINT_ANNOTATIONS_SOURCE` is either `none` or `database`.
   - `none` (the default): REST answers 503, and in GraphQL only the annotations field errors.
   - `database`: reads the `direct_paint_annotations` / `inherited_paint_annotations` arrays that
     the `genelists` documents already carry. They were empty in every row sampled.

   To decide: where the annotations come from once they are imported per release. Candidates are the
   PANTHER PAINT files, GO IBA annotations (via their with/from PTN), or the PANTHER API.
5. **Hermetic tests (default).**
   - Integration tests run on `mongodb-memory-server`, seeded with fixtures modelled on real
     documents.
   - The same harness accepts `AGB_TEST_DB_URL` to use a real Mongo instead.
   - Later, opt-in suites will run against the restored dump.
6. **Stricter TypeScript than the template (default):** `strict: true`, with
   `strictPropertyInitialization: false` so decorated DTOs and GraphQL types still compile.

## The API contract

**REST** — JSON only. Collections come back as `Page<T> = { total, offset, limit, items }`, where
`limit: null` means "all rows". Errors use Nest's standard body, `{ statusCode, message, error }`.

| Route (GET)                                     | Returns                                                                                       | Notes                                                                                                   |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `/api/health`                                   | `{ status, db }`                                                                              | 503 when the DB is not connected; `Cache-Control: no-store`                                             |
| `/api/stats`                                    | species and gene counts by tree shape                                                         | replaces the site's hard-coded release numbers                                                          |
| `/api/species`                                  | `Page<Species>`, all 255                                                                      | flat; `treeParentId` lets clients nest it                                                               |
| `/api/species/tree`                             | `SpeciesTreeNode[]`                                                                           | nested; orphaned subtrees are re-attached to their deepest existing ancestor (`placementInferred: true`) |
| `/api/species/:name`                            | `Species`                                                                                     | short or long name, exact then case-insensitive; 404 if unknown                                         |
| `/api/species/:name/proxy-species`              | `Page<Species>`                                                                               | extant species that can stand in for this ancestral genome; empty for extant species                    |
| `/api/species/:name/genes?proxy=&offset=&limit=` | `Page<GeneSummary>`                                                                          | `proxy` = an extant species (short or long name); without it, each gene's default proxy                 |
| `/api/species/:name/unmodelled-genes`           | `Page<GeneSummary>`                                                                           | extant species only (400 otherwise)                                                                     |
| `/api/genes/:ptn`                               | `Gene`                                                                                        | 404 if unknown                                                                                          |
| `/api/genes/:ptn/annotations`                   | `PaintAnnotation[]`                                                                           | 503 when no annotation source is configured                                                             |
| `/api/comparisons/:ancestral/:extant`           | `{ ancestral, extant, counts: { inherited, descendants, lost, gained, unmodelled } }`        | 404 for an unknown species; 400 if `extant` is not extant or `ancestral` is not one of its ancestors    |
| `/api/comparisons/:ancestral/:extant/inherited` | `Page<InheritedGene>`                                                                         | each gene has `descendants[]`, built from the comma-joined columns                                      |
| `/api/comparisons/:ancestral/:extant/lost`      | `Page<GeneSummary>`                                                                           |                                                                                                         |
| `/api/comparisons/:ancestral/:extant/gained`    | `Page<GeneSummary>`                                                                           | matches ancestor names as exact tokens (fixes F3)                                                       |

Docs are at `/api/docs` (Swagger UI) and `/api/docs-json`.

**GraphQL at `/graphql`.** The schema is code-first and committed as `src/schema.gql`. It has four
roots:

- `speciesList`
- `species(name)`
- `gene(ptn)`
- `comparison(ancestral, extant)`

plus `stats`. `Species` resolves `parent`, `children`, `ancestors { species }`, `proxySpecies`,
`genes(proxy, offset, limit)` and `unmodelledGenes`. `Gene` resolves `species`, `proxyGenes { species }`
and a nullable `paintAnnotations`. `GenomeComparison` resolves `counts`, `inherited`, `lost`, `gained`
and `unmodelled`.

The public endpoint has limits:

- a maximum depth (8)
- a complexity budget via `graphql-query-complexity`
- list fields default to 100 rows and are capped at 10,000, so bulk lists stay on REST

**Mapping rules** are written once, in the mappers, and unit-tested:

- A numeric string becomes a number, and a blank becomes `null`. This works whichever way the value
  is stored.
- The sentinels `NOT_AVAILABLE`, `NOT_AVAILABE` (sic), `NOT NAMED` and `""` become `null`.
- `parent_id: ""` becomes `null`.
- `isExtant` is derived from tree shape (the node has no children), not from `timescale`.
- `descent_ptns`, `descent_gnames` and `descent_longIds` are split on commas and zipped into
  `[{ ptn, name, pantherId }]`.
- A gene's `sequence` is the ungapped, uppercase protein; the stored string is kept as
  `alignedSequence`.
- Extant genes carry `pantherId` (their own long id); ancestral genes carry `proxyGene`.

## Legacy behaviour (reference for data semantics)

This is how the old API derives each answer, verified against the live service on 2026-09-22. The
new services reproduce these _semantics_, not the wire format.

| Legacy route (GET)                           | Collection                                                 | Filter                                                                                                                      | Row keys returned                                                                                                                                                                  |
| -------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/genelist/species-list`, `species-info/:s`  | `species`                                                  | all / `short_name` = s OR `long_name` = s                                                                                   | `id, short_name, long_name, taxon_id, timescale, gene_count, parent_short_name, parent_id, all_ancestors`                                                                          |
| `/genelist/species/:s/:proxy`                | `short_genelists` (`default species`) or `flat_genelists`  | short: `species_short`/`species_long` = s · flat: `species_short` = s AND `descent_spe_long` = proxy                         | `ptn, name, pthr, proxy_gene`, plus `total` = `short_genelists` count                                                                                                              |
| `/genelist/proxy_species/:s`                 | `flat_genelists`                                           | `distinct('descent_spe_long')` where `species_short` = s                                                                    | strings                                                                                                                                                                            |
| `/genelist/gene/:ptn`                        | `genelists`                                                | `ptn` = p                                                                                                                   | `_id, ptn, name, species_long, species_short, event, sequence, pthr, family_name, longId, paint_annotations, proxy_genes[{proxy_spe_short, proxy_spe_long, proxy_gene}], inherited_paint_annotations, direct_paint_annotations` |
| `/genelist/gene_go/:ptn`                     | scrape of pantree.org                                      | —                                                                                                                           | `[{ paint_annotations: [{ go_accession, go_name }] }]`, with `(NOT)` terms dropped                                                                                                 |
| `/genelist/gene-pass/:anc/:ext`              | `flat_genelists`                                           | `species_short` = anc AND `descent_spe_long`/`descent_spe_short` = ext AND `descent_ptns` !~ `/NOT_AVAILABLE/`               | `ptn, name, descent_ptns, descent_gnames, descent_longIds`                                                                                                                         |
| `/genelist/gene-loss/:anc/:ext`              | `flat_genelists`                                           | same pair AND `descent_ptns` ~ `/NOT_AVAILABLE/`                                                                            | `ptn, name`                                                                                                                                                                        |
| `/genelist/gene-gain/:anc/:ext`              | `short_genelists`                                          | `species_short`/`species_long` = ext AND `ancestor_species` !~ `new RegExp(anc)` AND `pthr` !~ `/NOT_AVAILABLE/`             | `ptn, name, proxy_gene`                                                                                                                                                            |
| `/genelist/gene-no-model/:ext`               | `flat_genelists`                                           | `species_short`/`species_long` = ext AND `pthr` ~ `/NOT_AVAILABLE/`                                                         | `ptn, name, proxy_gene`                                                                                                                                                            |
| `/genelist/direct-inherited/:s`              | `genomecomparisons`                                        | `child_species_short` = s                                                                                                   | everything (unused by both sites; not ported)                                                                                                                                      |

Further legacy behaviour to keep in mind:

- **Paging.** `?page=&limit=` meant `skip(limit * (page - 1))`; with no parameters, every row came
  back.
- **Not found** was a 200 with an empty `lists`.
- **Extant species** could be named by short or long name; for ancestral nodes the two names are
  always identical.
- **Largest lists.** The biggest extant list is WHEAT, with 102,802 genes. The biggest ancestral
  list is Triticeae, with 25,765.

## Steps

### Phase 0: Data access (deferred, not blocking)

- [ ] **(needs the user)** From 159.89.146.180:
  - `mongodump --db ancGenomesDB15 --gzip --archive=agb15.archive.gz`
  - `mongod --version` (driver 7.1 needs ≥ 4.2)
  - how the legacy process is supervised
  - its access logs
- [ ] Restore the dump into the local Mongo 7.0.1 service. This machine has 148 GB free.
- [ ] Inventory each collection: counts, sizes, indexes, a sample document, the `$type` of every
      field. Then verify the fixture assumptions below; the first four were built into the code
      without the data:
  - the delimiter used inside `ancestor_species`
  - `species_short` is set on every `short_genelists` and `flat_genelists` row (the services query
    by canonical short name only)
  - `descent_spe_short` and `descent_spe_long` always agree
  - `ptn` is unique within each species list, since it is used as the sort key
  - whether `NOT_AVAILABLE` is always the whole value (if so, `$ne` can use an index where the regex
    cannot)
- [ ] Record `explain('executionStats')` for every service query.

### Phase 1: Scaffold agb-api from c-api ✅

- [x] `package.json` (name `agb-api`):
  - **scripts:** the template's, plus `test:integration`, `cli`/`cli:dev` and `schema:generate`,
    with a separate Jest config per suite
  - **dependencies:** the template's list, minus auth, search, paginate and the misc packages;
    the GraphQL stack kept
  - **added:** `joi`, `graphql-query-complexity`, `@nestjs/throttler`, plus `mongodb-memory-server`
    and `cross-env` as dev dependencies
  - **installed:** Nest 11.2.5, `@nestjs/graphql` 13.4.5, Apollo 5.5.1, Mongoose 9.10.2
    (driver 7.6), Jest 29.7, 864 packages
- [x] Tooling: `tsconfig` (strict), `nest-cli.json`, `.prettierrc` (+ `endOfLine: auto`),
      `eslint.config.js` (flat config only), `.gitignore`, `.dockerignore`.
- [x] `src/winston/`, copied verbatim from the template.
- [x] `src/config/`: a `joi` schema over `process.env`; `.env` is optional; tested.
- [x] `src/app/configure-app.ts`, shared by `main.ts` and the integration tests.
- [x] `AppModule`: Mongoose, Winston, GraphQL (`graphiql` in dev only, `playground: false`, stack
      traces per `APP_ENV`, no subscriptions), the throttler guard for REST and GraphQL, and the
      `Cache-Control` interceptor. Access logging is Express middleware in `configureApp`.
- [x] **Deviation from the plan:** `autoSchemaFile: true` (in memory). `src/schema.gql` is written
      only by `npm run schema:generate`, and `schema.spec.ts` fails when the file is stale, so
      nothing writes to disk at runtime.
- [x] `CliModule` + `src/cli.ts` (`db:indexes`, `data:check`), without the HTTP or GraphQL wiring.

### Phase 2: Data layer ✅

- [x] Storage schemas for `species`, `genelists`, `short_genelists` and `flat_genelists`, each with
      an explicit collection, `autoIndex: false` and `strictQuery: 'throw'`.
- [x] Indexes declared on the schemas and created by `db:indexes` (verified against the local Mongo):
  - `genelists {ptn}`
  - `short_genelists {species_short, ptn}`
  - `flat_genelists {species_short, descent_spe_short, ptn}`
- [x] `SpeciesSnapshot` (pure) and `SpeciesIndex` (TTL load, one shared load for concurrent
      requests, keeps the last good tree if a reload fails). It covers name resolution, the repaired
      tree (`treeParentId`), `isExtant` from the _repaired_ tree, stats and diagnostics.
- [x] `ResultCache`: an LRU bounded by both entry count and row count, with a TTL and in-flight
      de-duplication. REST and GraphQL share it.
- [x] Mappers and services. Reads use `lean()`, inclusion projections, `maxTimeMS` and
      `sort({ ptn: 1 })`.

### Phase 3: REST API ✅

- [x] Controllers for species (list, tree, one), stats, genes, annotations, species genes, proxy
      species, unmodelled genes, comparisons (summary, inherited, lost, gained), health, and `/`.
- [x] Validation: the paging DTO, proxy checks (extant, and a descendant), and pair checks
      (extant, and an ancestor).
- [x] Swagger at `/api/docs`, 14 paths.

### Phase 4: GraphQL API ✅

- [x] Object types that double as the Swagger models, plus `Paginated()`.
- [x] Resolvers: `SpeciesResolver`, `AncestorResolver`, `StatsResolver`, `SpeciesGenesResolver`,
      `GeneResolver`, `ProxyGeneResolver`, `ComparisonResolver`.
- [x] Limits: a depth rule (8), the complexity plugin (150,000) and a page cap (10,000).
      `paintAnnotations` is nullable, so its error stays on that one field.

### Phase 5: Tests ✅

- [x] Unit: **78 tests in 9 suites**. They cover config, text helpers (the exact-name regex across
      delimiters and arrays), `ResultCache`, the depth rule, `SpeciesSnapshot`, gene mappers,
      `toInheritedGene`, the Winston module, and the schema snapshot.
- [x] Integration: **72 tests in 5 suites**, on mongodb-memory-server (MongoDB 8.2.6) with the seed
      fixtures. They cover every REST route and status; names with `%2F`, `%20` and parentheses;
      paging; `Cache-Control`; gzip; security and CORS headers; throttling on REST and GraphQL;
      GraphQL queries and partial errors; and the depth, complexity and page-cap rejections.

### Phase 6: Docs and packaging ✅

- [x] `CLAUDE.md`, `README.md`, `.env.example`, `.vscode/launch.json` and
      `.claude/settings.local.json` (an allowlist of build, lint and test commands, as in c-api).
- [x] `Dockerfile` (node:20-alpine, multi-stage, non-root, healthcheck) and `docker-compose.yml`
      (mongo:7 on host port 27018 + api).
  - The image builds, and `docker run` against the local Mongo reports `healthy`.
  - It logs JSON and serves no GraphiQL in prod.
- [x] Security:
  - `npm audit` found 7 high-severity advisories, all multer 2.2.0 (pinned by
    `@nestjs/platform-express` 11.2.5, the latest 11.x). An npm override to `multer@2.4.0` brings
    the audit to **0 vulnerabilities**, dev dependencies included, without the NestJS 12 major
    upgrade.
  - helmet's `upgrade-insecure-requests` is removed, because it would break Swagger UI on a
    plain-HTTP host.
- [x] Gate: all passed after the last change.
  - typecheck, eslint and prettier are clean.
  - unit 78/78; integration 72/72.
  - build, the prod boot and the Docker build all succeed.

### Phase 7: Real-data verification (needs Phase 0)

- [ ] Run `db:indexes`, then take cold timings for the heaviest queries. Target: under 1 s (legacy:
      2–21 s).
- [ ] `scripts/parity.ts`: compare the new API against the legacy API _semantically_ (the same ptn
      sets and counts per question), allowing only the F3 fix. **Never call legacy `gene_go`.**
- [ ] `data:check` on the real data. Hand its report to the data owner.

### Phase 8: Deploy, then migrate the site (separate task)

- [ ] Deploy next to legacy; TLS through a reverse proxy.
- [ ] Move the site to the new contract, in its own plan in `../agb-site/.plans/`.
- [ ] Retire legacy.

### Phase 9: Additive (after deciding decision 4)

- [ ] An `annotations:import` CLI for the chosen GO annotation source, with
      `PAINT_ANNOTATIONS_SOURCE=database` as the default.

## Faults found in agb_api_server

Measured against `http://159.89.146.180:3003` on 2026-09-22. The note on each fault says how the
new API fixes it.

1. **F1 — `gene_go` crashes the whole process.**
   - **What happens:** the scrape runs in a `request` callback, outside Express's error handling.
     pantree.org now returns a 403 page, so `html.split(...)[1]` is `undefined` and `.split()`
     throws. The exception is uncaught and Node exits.
   - **Evidence:** a single `gene_go` call killed all eight requests in flight (curl exit 52 within
     0.6 s). The process came back within seconds, but the restart **flushes `apicache`**. Every
     ancestral gene view on the site triggers this call.
   - **Fix:** there is no scrape. The annotations are read from a configured source, and when none
     is available the API answers 503 or a GraphQL field error. Nothing can crash the process.
2. **F2 — pantree.org is gone.** Both the endpoint and the site root return 403.
   - **Fix:** the scrape is not ported (decision 4).
3. **F3 — gene-gain uses `new RegExp(anc)`, unescaped and unanchored.** The partition check on
   ARATH (`gene_count` 27,416) shows what that costs:

   | Ancestor     | Descendants | Gained | Unmodelled | Total  |
   | ------------ | ----------- | ------ | ---------- | ------ |
   | Brassicaceae | 24,411      | 51     | 2,966      | 27,428 |
   | malvids      | 24,330      | 132    | 2,966      | 27,428 |
   | rosids       | 24,243      | 132    | 2,966      | 27,341 |

   - **What's wrong:** the rosids row comes up 87 genes short, because `/rosids/` also matches
     `eurosids`. `gain/rosids/ARATH` returns the same 132 rows as `gain/malvids/ARATH`; it should
     return 219. The same fault affects rosids for 15 rosid species. The name is also injected into
     the regex unescaped.
   - **Fix:** the ancestor name is matched as an exact token. It is escaped, and bounded by the
     start or end of the value or by any character outside `[A-Za-z0-9_/-]`. That is the full
     character set of the 115 ancestral names, so the match holds for any delimiter and for array
     storage.
4. **F4 — `console.log(lists)`** runs on every non-default proxy list, synchronously dumping
   thousands of documents to stdout.
   - **Fix:** a Winston access log records one line per request.
5. **F5 — Cold latency is 2–21 s** (warm: 0.28–0.61 s). No indexes are known.
   - **Fix:** declared indexes plus `db:indexes`, `lean()`, inclusion projections, a bounded result
     cache with de-duplication, and gzip. Measure in Phase 7.
6. **F6 — Errors are indistinguishable from data.** A DB error returns 200 with `success: false` and
   leaks the raw error.
   - **Fix:** real status codes and Nest's generic 500 body.
7. **F7 — Heavy payloads.** There is no `Content-Type`, the JSON is pretty-printed, and nothing is
   compressed. `gene-pass/Homo-Pan/HUMAN` is 4.81 MB; compact and gzipped it would be 0.61 MB.
   - **Fix:** compact JSON and compression.
8. **F8 — `[...new Set(lists)]` is a no-op.** No duplicates were found in the seven samples.
   - **Fix:** removed. Rows are keyed and sorted by `ptn`.
9. **F9 — two identical `$or` branches** mean a proxy can only be named by its long name.
   - **Fix:** names are resolved to a canonical species, so either name works.
10. **F10 — Stack.** Everything is end-of-life, and there is no config, no tests and no logging.
    - **Fix:** this task.

## Data integrity findings

From the live `species-list` (255 rows). These are for the data owner. The API detects them
(`data:check`) and routes around them where it can (`treeParentId`).

1. **38 species are unreachable from LUCA; 22 of them are extant**, Arabidopsis among them.
   - **Cause:** three parent ids have no row: 38 (the parent of BRANA and BRARP), 101 (Firmicutes and
     MYCGE) and 254 (fabids and malvids). The missing nodes are probably a Brassica node,
     Firmicutes-Tenericutes and eurosids.
   - **Effect:** the site's tree drops these subtrees silently. The API's `treeParentId` re-attaches
     each one to its deepest existing ancestor, found through `all_ancestors`.
2. **`eudicotyledons` is an internal node stored with `timescale: "0"`.** Counting by tree shape
   gives 112 ancestral and 143 extant species, not 111 and 144.
3. **`all_ancestors` is ordered by age, not by lineage.** Blank or tied ages reorder it: 157 of the
   255 rows differ from their `parent_id` chain.
4. **The site's release page is stale.** It shows PANTHER 14.1, 111 / 132 species and 1,210,026 /
   2,256,854 genes. The database holds 112 / 143 species and 1,424,809 / 2,625,353 genes (by tree
   shape).

## Recovery Checkpoint

> **⚠ UPDATE THIS AFTER EVERY CHANGE**

- **Last completed action:** Phase 6 done.
  - The final gate passed: typecheck, lint and prettier clean; unit 78/78; integration 72/72;
    build; prod boot; Docker build and run (healthy).
  - `npm audit`: 0 vulnerabilities after the multer override.
- **Next immediate action:** **(needs the user)** get the `ancGenomesDB15` dump and the server's
  `mongod --version` (Phase 0). Then:
  - restore the dump locally
  - verify the four fixture assumptions
  - `npm run cli -- db:indexes` and `npm run cli -- data:check`
  - Phase 7: timings, then a parity script against legacy, **never calling `gene_go`**
- **Recent commands run:**
  - `npm install` (with the multer override)
  - `npm audit`
  - `npm run typecheck`, `npx eslint`, `npx prettier --check`
  - `npx jest`, `npm run test:integration`, `npm run build`
  - `docker build -t agb-api:local .` and `docker run … agb-api:local` (stopped)
- **Uncommitted changes:** none in `agb-api/`, which is committed on `main` in 12 chronological
  commits (`fedf7b1` onwards). Still uncommitted: `docs/current-api-server-problems.md` at the root
  (the user asked for the API only), and `.claude/settings.local.json`, which the user's global git
  ignore excludes.
- **Also done:** the legacy lockfile audit (`npm audit --package-lock-only`, read-only) found 65
  vulnerable packages (18 critical); details are in the docs report.
- **Environment state:**
  - Nothing is running.
  - The local Docker image `agb-api:local` is left in place; remove it with
    `docker rmi agb-api:local`.
  - The local MongoDB 7.0.1 service holds no AGB data and no leftover test databases.
  - The mongodb-memory-server binary (MongoDB 8.2.6) is cached.

## Failed Approaches

<!-- Prevent repeating mistakes after context reset -->

| What was tried | Why it failed | Date |
| --- | --- | --- |
| Calling `/genelist/gene_go/PTN000000526` on the live API during a parallel sweep | It crashed the legacy process (F1), killing all eight in-flight requests and flushing `apicache`. **Never call `gene_go` on the legacy server.** | 2026-09-22 |
| Reading live responses with PowerShell `Invoke-WebRequest` | The API sends no `Content-Type`, so `.Content` comes back as a byte array. Use `curl` from Bash. | 2026-09-22 |
| Inline `node -e` with regex literals, run from Bash | The shell strips backslashes, causing a SyntaxError. Write the script to a file first. | 2026-09-22 |
| Deriving `isExtant` from the stored `parent_id` | rosids came out "extant": its only child, malvids, points at the missing eurosids node. `isExtant`, `children` and `parent` now follow the repaired tree (`treeParentId`). A spec covers it. | 2026-09-22 |
| Integration tests under plain `jest` | Every connection failed with "Missing required sub-document 'driver' in the client metadata document". Mongoose ships its own `mongodb@7.6.0`, which loads `os` with a dynamic `import()`; Jest's CommonJS VM rejects that without `--experimental-vm-modules`, and the driver then sends a handshake with no metadata. Fixed with `cross-env NODE_OPTIONS=--experimental-vm-modules` in `test:integration`. Production is unaffected. | 2026-09-22 |
| GraphQL `@ArgsType` fields with only `@Field` decorators | The global `ValidationPipe` (`whitelist: true`) stripped `offset`, `limit` and `proxy`, so `genes(offset: 1, limit: 2)` returned the defaults. Every arg needs a class-validator decorator. Covered by a test. | 2026-09-22 |
| Testing the GraphQL page cap under a low complexity budget | The complexity plugin rejects `limit: 20000` before any resolver runs, which is correct. The cap is tested in its own app at the default budget. | 2026-09-22 |
| Counting throttled requests across REST and GraphQL together | `@nestjs/throttler` counts per handler, so `/api/stats` and the GraphQL `stats` field have separate buckets. Each is tested on its own. | 2026-09-22 |
| First `test:integration` run | It spent about 7 minutes downloading the mongod binary and then saw ECONNREFUSED. It has not recurred since the binary was cached. | 2026-09-22 |
| helmet's default CSP in prod | It includes `upgrade-insecure-requests`, which would send Swagger UI's same-origin assets to `https://` on a plain-HTTP host. The directive is now removed. | 2026-09-22 |
| `npm audit fix` | Its only offer was NestJS 12, a major upgrade. An npm `overrides` pinning `multer@2.4.0` (still multer 2.x) fixed all 7 advisories instead. | 2026-09-22 |

## Files Modified

| File | Action | Status |
| --- | --- | --- |
| `.plans/template.md`, `.plans/*/.gitkeep` | copy / create | done |
| `.plans/refactor/express-to-nestjs-port.md` | create (this plan) | done |
| `package.json`, `tsconfig*.json`, `nest-cli.json`, `.prettierrc`, `eslint.config.js`, `.gitignore`, `.dockerignore` | create | done |
| `src/main.ts`, `src/cli.ts`, `src/cli.module.ts`, `src/app/*`, `src/config/*`, `src/winston/*` (from c-api) | create | done |
| `src/common/{text,cache,paging,http,logging,graphql}/**` | create | done |
| `src/health/*`, `src/species/**`, `src/genes/**`, `src/comparison/**`, `src/commands/**` | create | done |
| `src/graphql/{graphql-options,resolvers,generate-schema,schema.spec}.ts`, `src/schema.gql` | create | done |
| `test/{jest-integration.json,setup/*,utils/test-app.ts,fixtures/seed.ts,*.integration-spec.ts}` | create | done |
| `.env.example`, `.vscode/launch.json`, `.claude/settings.local.json` | create | done |
| `CLAUDE.md`, `README.md`, `Dockerfile`, `docker-compose.yml` | create | done |
| `package-lock.json` | generated (with the `multer` override) | done |
| `../docs/current-api-server-problems.md` | create: a standalone report on the legacy server's problems, for the team (user request) | done |

## Blockers

- **No data.** Phases 0 and 7 are blocked. Everything else goes ahead against fixtures.
- **Production MongoDB version unknown.** Driver 7.1 needs MongoDB ≥ 4.2.
- **GO annotation source undecided** (decision 4).

## Notes

- **Route layout.** Everything lives under `/api/*` except `/graphql` and `GET /`, which returns an
  index of links. There is no global prefix, so GraphQL stays at its conventional path.
- **Names in paths are resolved first.** Every route resolves the species it names (short or long
  name) before querying, and then queries only by the canonical short name. This removes the
  legacy `$or` on short/long names, which would force a collection scan on any branch without an
  index. Resolution is exact first, then case-insensitive, so `human` finds HUMAN.
- **Storage schemas and API models are separate classes.** Storage uses snake_case strings, the API
  uses camelCase numbers. The GraphQL types carry the Swagger decorators too, so each API shape is
  declared exactly once.
- **Template quirks not copied:**
  - `.env` is optional; the template requires it.
  - no Firebase keys in the config schema
  - fixed Jest `rootDir` per suite
  - node:20 in the Dockerfile
  - a correct compose URL
  - no `.eslintrc.js`
  - no `NODE_ENV`-dependent GraphQL defaults and no `installSubscriptionHandlers`
  - relative imports, not `src/...` paths
- **Ports.** The new API defaults to `3004`. Legacy uses `3003`, the site's dev server `4210`, and
  an unrelated NestJS app on this machine `3002`.

## Lessons Learned

<!-- Fill during and after task. Useful for future tasks. -->

- The code and the live server disagree in ways that matter. The code suggested `gene_go` merely
  "closes the connection"; in fact it crashes the whole process. Probe the live system, but never
  with a request that can crash it.
- The site's slices and its `e2e/fixtures/api.ts` were the fastest route to the real wire shapes.
  The legacy Mongoose schemas are partly fiction.
- Build the fixtures from the defects found in the live data (a missing parent, `timescale: "0"` on
  an internal node, a `/` in a name, a blank `taxon_id`, the rosids/eurosids pair). Writing the spec
  against those caught the `isExtant` bug before any code ran against real data.
- `whitelist: true` on the global ValidationPipe applies to GraphQL args too. An args class without
  class-validator decorators silently loses its values.
- `npm ls mongodb` is worth a look whenever a connection fails only under test: two copies of the
  driver meant two different behaviours.

## Additional Context (Claude)

**Alternatives considered**

- **A `/genelist` compatibility layer** (the previous draft). Dropped because the API is king and the
  site will adapt. Semantic parity against legacy (Phase 7) still proves the data is unchanged.
- **GraphQL only.** Bulk lists of up to 102,802 rows suit cacheable REST `GET`s better than a GraphQL
  executor resolving every field of every row.
- **Porting the pantree scrape behind a flag.** The upstream is dead, so the code would be dead too.
- **`cache-manager` for result caching.** Its store API has broken across majors, and a bounded LRU
  with in-flight de-duplication is about 80 lines we can test directly.

**Risks**

1. The fixture assumptions listed in Phase 0 could be wrong for the real data. The mappers accept
   both string and number storage to limit the damage, and Phase 7 verifies the rest.
2. A public GraphQL endpoint without auth depends on its depth and complexity limits. Both are
   tested.
3. There may be hidden consumers of the legacy routes, so keep legacy running until its access logs
   are checked.
4. Index builds on the production DB need a quiet window and the user's go-ahead.
5. Mixed content once the site is served over HTTPS.

**For the site — its own later task.** Adopt the new contract. The tree comes from `treeParentId`
or `/api/species/tree` (which fixes the 38 missing species), `isExtant` comes from the API, the
release numbers from `/api/stats`, and the comparison header counts from the `counts` endpoint. RTK
Query can keep REST for the bulk lists and use `@rtk-query/graphql-request-base-query` for GraphQL
where it helps.
