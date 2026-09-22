# Task: Port agb_api_server (Express 4 + Mongoose 4) to a NestJS 11 REST + GraphQL API in agb-api

**Status:** ACTIVE — Phases 1–6 in progress, running against fixtures because no data is available
yet. Phases 0 and 7 are waiting on a database dump.
**Issue:** — (user request, 2026-09-22)
**Branch:** — (`panther-agb-2` is not a git repo yet)

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

### Phase 1: Scaffold agb-api from c-api

- [ ] `package.json` (name `agb-api`):
  - **scripts:** from the template, plus `test:integration`, `cli`, and a separate Jest config per
    suite
  - **dependencies:** the template's list, minus auth, search, paginate and the other misc packages
  - **kept:** the GraphQL stack (`@nestjs/graphql`, `@nestjs/apollo`, `@apollo/server`,
    `@as-integrations/express5`, `graphql`)
  - **added:** `joi`, `graphql-query-complexity`, `@nestjs/throttler`, `mongodb-memory-server`
    (dev) and `cross-env` (dev)
- [ ] Copy and trim the tooling: `tsconfig` (+ `strict`), `nest-cli.json`, `.prettierrc`,
      `eslint.config.js` (the flat config only), `.gitignore`, `.dockerignore`,
      `.vscode/launch.json`, `.claude/settings.local.json`.
- [ ] `src/winston/`, verbatim from the template.
- [ ] `src/config/`: the template's `ConfigService` shape (`get`, `isEnv`), validating `process.env`
      with a `joi` schema. `.env` is optional: `dotenv` loads it if it is present. Add a spec.
- [ ] `src/app/configure-app.ts`: helmet, compression, CORS, `ValidationPipe`, Swagger, shutdown
      hooks, `trust proxy`. Both `main.ts` and the integration tests call it, so the tests exercise
      the same middleware.
- [ ] `AppModule`:
  - Mongoose, Winston and GraphQL, where `graphiql` is on in dev only, `playground: false`, the
    stack traces follow `APP_ENV`, there are no subscription handlers, and `autoSchemaFile` writes
    to disk outside prod
  - a throttler guard that serves both REST and GraphQL
  - the cache-control interceptor and the access-log middleware
- [ ] A `CliModule` for `nestjs-command`, without the HTTP or GraphQL wiring.

### Phase 2: Data layer

- [ ] Storage schemas for `species`, `genelists`, `short_genelists` and `flat_genelists`:
  - explicit `collection` names
  - `versionKey: false`, `autoIndex: false`, `strictQuery: 'throw'`
  - every field that is filtered on declared
- [ ] Indexes are declared on the schemas and created only by the `db:indexes` command:
  - `genelists {ptn}`
  - `short_genelists {species_short, ptn}`
  - `flat_genelists {species_short, descent_spe_short, ptn}`
- [ ] `SpeciesIndex`:
  - loads all species into memory, with a TTL
  - resolves names (exact, then case-insensitive)
  - builds the children map and `isExtant`
  - computes `treeParentId`, re-attaching orphans to their deepest existing ancestor
  - also provides stats and diagnostics
- [ ] `ResultCache`: an LRU bounded by both entry count and total row count, with TTLs and
      **in-flight de-duplication**, so concurrent cold requests share a single query. The services
      use it, so REST and GraphQL share it too.
- [ ] Mappers from raw documents to API models, following the rules above. Reads use `lean()`,
      inclusion projections, `maxTimeMS`, and a deterministic `sort({ ptn: 1 })`.

### Phase 3: REST API

- [ ] Controllers for species, stats, genes (including annotations), comparisons, and health, plus
      `GET /`.
- [ ] Validation:
  - `offset` ≥ 0
  - `limit` from 1 to 1,000,000 (omit it to get every row)
  - species names are resolved to canonical species before any query runs
  - comparisons check that the pair really is ancestral → extant
- [ ] Swagger models on every route.

### Phase 4: GraphQL API

- [ ] Object types (they double as the Swagger models) and a `Paginated()` factory.
- [ ] Resolvers for species, ancestors, stats, genes, proxy genes and comparisons.
- [ ] A depth-limit validation rule, the complexity plugin, per-field complexity for list fields, a
      page cap, and `paintAnnotations` made nullable so its error stays on that field.

### Phase 5: Tests

- [ ] Unit:
  - config, mappers and text helpers
  - the gene-gain token regex (delimiters `,` `;` `|` and space, arrays, `rosids` vs `eurosids`,
    `Firmicutes` vs `Firmicutes-Tenericutes`, regex metacharacters)
  - `SpeciesIndex`: resolution, `isExtant`, orphan placement, stats
  - `ResultCache`: TTL, LRU, row budget, de-duplication, errors not cached
  - the depth rule
- [ ] Integration, on mongodb-memory-server with a seeded miniature dataset:
  - every REST route and its statuses
  - `%2F` and `%20` in names, paging, `Cache-Control`, gzip
  - GraphQL queries, the depth and complexity rejections, and field errors on `paintAnnotations`

### Phase 6: Docs and packaging

- [ ] `CLAUDE.md`, `README.md`, `.env.example`.
- [ ] `Dockerfile` (node:20-alpine, multi-stage, non-root, healthcheck) and `docker-compose.yml`
      (mongo:7 + api).
- [ ] Gate: `build`, `lint`, `test` and `test:integration` are all clean, the app boots against the
      local Mongo, and a smoke run of `/api/health`, `/api/docs` and `/graphql` passes.

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

- **Last completed action:** rewrote this plan for the user's second follow-up. The API is king, so
  the new contract is clean. There is no legacy layer and no authentication, and implementation
  starts now. Ancestral names were confirmed to use only `[A-Za-z_/-]`, which the token regex relies
  on.
- **Next immediate action:** Phase 1. Check package versions and peer dependencies, write
  `package.json` and the tooling, then run `npm install`.
- **Recent commands run:**
  - the `curl` sweeps of the live API (samples are in the session scratchpad, which is temporary)
  - node analysis scripts over those samples
  - greps of the template's `node_modules`
- **Uncommitted changes:** `agb-api/.plans/**`. Not a git repo.
- **Environment state:** nothing is running. The local MongoDB 7.0.1 service is up and has no AGB
  database.

## Failed Approaches

<!-- Prevent repeating mistakes after context reset -->

| What was tried | Why it failed | Date |
| --- | --- | --- |
| Calling `/genelist/gene_go/PTN000000526` on the live API during a parallel sweep | It crashed the legacy process (F1), killing all eight in-flight requests and flushing `apicache`. **Never call `gene_go` on the legacy server.** | 2026-09-22 |
| Reading live responses with PowerShell `Invoke-WebRequest` | The API sends no `Content-Type`, so `.Content` comes back as a byte array. Use `curl` from Bash. | 2026-09-22 |
| Inline `node -e` with regex literals, run from Bash | The shell strips backslashes, causing a SyntaxError. Write the script to a file first. | 2026-09-22 |

## Files Modified

| File | Action | Status |
| --- | --- | --- |
| `.plans/template.md`, `.plans/*/.gitkeep` | copy / create | done |
| `.plans/refactor/express-to-nestjs-port.md` | create (this plan) | done |
| `package.json`, `tsconfig*.json`, `nest-cli.json`, `.prettierrc`, `eslint.config.js`, `.gitignore`, `.dockerignore`, `.env.example` | create | planned (Phase 1) |
| `.claude/settings.local.json`, `.vscode/launch.json` | create | planned (Phase 1) |
| `src/main.ts`, `src/cli.ts`, `src/app/*`, `src/config/*`, `src/winston/*`, `src/common/**`, `src/health/*` | create | planned (Phase 1) |
| `src/species/**`, `src/genes/**`, `src/comparison/**`, `src/commands/**`, `src/schema.gql` | create | planned (Phases 2–4) |
| `test/**` | create | planned (Phase 5) |
| `CLAUDE.md`, `README.md`, `Dockerfile`, `docker-compose.yml` | create | planned (Phase 6) |

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
