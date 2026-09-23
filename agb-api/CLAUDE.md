# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ancestral Genomes API (AGB) — a NestJS 11 service over the ancestral-genomes MongoDB
(`ancGenomesDB15`): reconstructed ancestral genomes from PANTHER, their genes, and comparisons with
their extant descendants. It serves **REST** (`/api/*`, bulk lists, cacheable GETs) and **GraphQL**
(`/graphql`, nested lookups) from one set of services. Public, read-only, **no authentication**.

It replaces the Express 4 service at `C:/work/panther/agb_api_server` (still live at
`http://159.89.146.180:3003`, where `../agb-site` points today). **This API is the source of truth
for the contract** — the site adapts to it, not the other way round. The stack and conventions come
from `C:/work/panther/annotations/go-pango-annotations-trials/c-api`.

The port is tracked in [.plans/refactor/express-to-nestjs-port.md](.plans/refactor/express-to-nestjs-port.md),
which also records the legacy behaviour, the legacy faults and the data-integrity findings.

## Commands

```bash
npm run start:dev            # watch mode, port 3004 (SERVER_PORT)
npm run build                # nest build → dist/
npm run start:prod           # node dist/main

npm test                     # unit: src/**/*.spec.ts (includes the schema snapshot test)
npm run test:integration     # test/*.integration-spec.ts on mongodb-memory-server
npm run test:all
npx jest src/species/species-snapshot.spec.ts          # one unit file
npm run test:integration -- test/genes.integration-spec.ts

npm run lint                 # eslint --fix (flat config) — lint:check to only report
npm run format               # prettier
npm run typecheck            # tsc --noEmit (src + test)
npm run schema:generate      # rewrite src/schema.gql from the decorators

npm run cli -- db:indexes    # after build: create the declared indexes (never drops)
npm run cli -- data:check    # report data-integrity problems in the species tree
npm run cli:dev -- data:check  # same, via ts-node
```

Configuration is environment variables validated by joi (`src/config/config.schema.ts`); `.env` is
optional and loaded by `dotenv` when present. See `.env.example` for every key and its default.

## Architecture

### Source Layout

- `src/main.ts` — bootstrap: Winston as the Nest logger, then `configureApp`, then listen.
- `src/app/` — `AppModule` (Mongoose, Winston, GraphQL, throttler, cache-control interceptor) and
  `configure-app.ts` (helmet, compression, access log, CORS, ValidationPipe, Swagger). **Integration
  tests call `configureApp` too** — put HTTP-level setup there, not in `main.ts`.
- `src/config/` — `ConfigService` (`get`, `isEnv`, `corsOrigins`), the c-api shape over `process.env`.
- `src/winston/` — copied verbatim from c-api (`WINSTON_MODULE_PROVIDER`).
- `src/common/` — `text.ts` (sentinels, number parsing, `exactNameRegExp`), `paging/` (`Page<T>`,
  `Paginated()`, REST DTO, GraphQL args and complexity helpers), `cache/` (`ResultCache`), `http/`
  (Cache-Control, access log), `logging/`, `graphql/` (depth rule, complexity plugin, throttler guard).
- `src/species/` — `SpeciesSnapshot` (pure: the whole tree, name resolution, repaired tree, stats,
  diagnostics) and `SpeciesIndex` (loads it with a TTL). REST: `/api/species`, `/api/species/tree`,
  `/api/species/:name`, `/api/stats`.
- `src/genes/` — `genelists` / `short_genelists` / `flat_genelists` schemas, `GenesService`,
  `AnnotationsService`. REST: `/api/genes/:ptn[/annotations]`, `/api/species/:name/{genes,
  proxy-species,unmodelled-genes}`. It also resolves `Species.genes` etc. in GraphQL
  (`SpeciesGenesResolver`), which keeps the module graph acyclic: species ← genes ← comparison.
- `src/comparison/` — `/api/comparisons/:ancestral/:extant[/inherited|lost|gained]`.
- `src/graphql/` — Apollo options, the resolver list, `generate-schema.ts`, the schema snapshot spec.
- `src/commands/` + `src/cli.ts` + `src/cli.module.ts` — `nestjs-command` CLI without HTTP/GraphQL.
- `test/` — integration specs, `fixtures/seed.ts` (a miniature of the real data, defects included),
  `utils/test-app.ts` (boots the real AppModule on a seeded database).

### Request flow

Controller / resolver → service → `ResultCache.wrap(key, load)` → Mongoose `lean()` query → mapper
→ API model. Every route that names a species resolves it through `SpeciesIndex` **first**, then
queries the gene collections by the canonical **short name only** (one indexed field — the legacy
`$or` over short and long names turns into a collection scan on any unindexed branch).

### The contract

- **REST**: JSON; collections are `Page<T> = { total, offset, limit, items }` (`limit: null` = all
  rows; omit `limit` to get everything — the site filters and exports client-side). Errors use
  Nest's standard body `{ statusCode, message, error }`: 404 unknown species/gene, 400 invalid
  paging, proxy or comparison pair, 503 annotations with no source, 429 throttled.
- **GraphQL**: code-first; `src/schema.gql` is the committed contract. Roots: `speciesList`,
  `species(name)`, `gene(ptn)`, `comparison(ancestral, extant)`, `stats`. Unknown species/gene →
  `null`, invalid input → error. List fields page (default 100, max `GRAPHQL_MAX_PAGE_SIZE`).
- **Mapping** (in the mappers, nowhere else): numeric strings → numbers, `NOT_AVAILABLE` /
  `NOT_AVAILABE` / `NOT NAMED` / `""` → `null`, comma-joined descendant columns → zipped arrays,
  `sequence` ungapped (the stored one is `alignedSequence`), extant rows carry `pantherId`,
  ancestral rows carry `proxyGene`.

### Data model (the collections, as stored)

- `species` (255 rows) — numeric columns as text, root `parent_id: ""`, `all_ancestors` =
  `[[mya, name], …]` **ordered by age, not lineage**.
- `genelists` — one document per gene (`ptn`), with `proxy_genes` and (empty) PAINT arrays.
- `short_genelists` — one row per gene of a species' genome; `proxy_gene` is the default proxy for
  ancestral species and the gene's own id for extant ones; `ancestor_species` lists the ancestral
  genomes its lineage passes through.
- `flat_genelists` — ancestral gene × descendant species, with comma-joined `descent_*` columns or
  `NOT_AVAILABLE` (lost); extant species also keep their unmodelled genes here (`pthr: NOT_AVAILABLE`).

## Enforced Patterns

- **Storage schemas and API models are separate.** `*/schemas/*.schema.ts` mirror storage
  (snake_case, types as stored); `*/models/*.model.ts` are the API (camelCase, typed) and carry
  **both** `@Field` (GraphQL) and `@ApiProperty` (Swagger) so each shape is declared once.
- Every schema: explicit `collection`, `versionKey: false`, `autoIndex: false`,
  `strictQuery: 'throw'`, `id: false`. Declare every field you filter on — an undeclared filter path
  throws instead of being silently dropped.
- Reads: `.lean()`, **inclusion** projections, `.maxTimeMS(DB_QUERY_TIMEOUT_MS)`, `sort({ ptn: 1 })`.
- Put derived shaping in the mappers; services return API models; controllers and resolvers stay
  thin. REST and GraphQL call the same service methods.
- Cache query results through `ResultCache` (shared by both transports); never cache in a
  controller. Cached values are shared — treat them as immutable.
- **Every GraphQL `@ArgsType` field needs a class-validator decorator** — the global ValidationPipe
  runs with `whitelist: true` and silently strips undecorated args.
- GraphQL list fields declare `complexity` (`pagedComplexity` / `listComplexity`) and validate
  paging with `graphqlPageRequest`. Fields that may fail independently are nullable
  (`paintAnnotations`).
- A resolver's injected service must not share a name with one of its field methods (`species`,
  `genes`) — TypeScript reports a duplicate identifier. Use `speciesIndex`, `genesService`.
- Any regex built from input goes through `escapeRegExp` / `exactNameRegExp`.
- After changing GraphQL decorators: `npm run schema:generate` (the unit suite fails otherwise).
- Relative imports only (no `src/...` paths); unused parameters are prefixed `_`.

## Gotchas

- **Never call the legacy `/genelist/gene_go/:ptn`** on `159.89.146.180:3003`: it crashes that
  whole process (and flushes its cache). pantree.org, which it scrapes, answers 403.
- `isExtant`, `children` and `parent` follow the **repaired** tree (`treeParentId`): three parent
  nodes (38, 101, 254) are missing from `species`, and by stored `parent_id` alone rosids would look
  like a leaf. `eudicotyledons` is internal despite `timescale: "0"` — never infer extant from
  timescale.
- `autoIndex` is off everywhere; indexes exist only after `npm run cli -- db:indexes`.
- Assumptions made without the real data (verify when the dump arrives — plan Phase 0): the
  `ancestor_species` delimiter (the matcher accepts any), `species_short` on every gene row,
  `descent_spe_short`/`descent_spe_long` consistent, `ptn` unique per list.
- `test:integration` needs `NODE_OPTIONS=--experimental-vm-modules` (already in the script):
  Mongoose's bundled `mongodb@7.6` loads `os` with a dynamic `import()`, which Jest's CommonJS VM
  rejects otherwise — the symptom is "Missing required sub-document 'driver' in the client metadata
  document".
- The throttler counts per route, so REST and GraphQL buckets are separate.
- Port 3004 by default; legacy is 3003, the site's dev server 4210, and an unrelated NestJS app on
  this machine uses 3002.

## Testing

- Unit specs sit next to the code (`src/**/*.spec.ts`). Prefer pure units (`SpeciesSnapshot`,
  mappers, `text.ts`, `ResultCache`) over mocking Mongoose.
- Integration specs (`test/*.integration-spec.ts`) boot the real `AppModule` via
  `createTestApp(dbName, env)`, which seeds `test/fixtures/seed.ts` into its own database, creates
  the declared indexes and drops the database afterwards. Pass env overrides for behaviour switches
  (`PAINT_ANNOTATIONS_SOURCE`, `THROTTLE_LIMIT`, `GRAPHQL_MAX_COMPLEXITY`).
- `mongodb-memory-server` is started once in `test/setup/global-setup.ts` (first run downloads
  mongod). Set `AGB_TEST_DB_URL=mongodb://localhost:27017` to use a real server instead.
- The fixtures reproduce the real data's defects on purpose (missing parent, timescale-0 internal
  node, `/` in a name, blank taxon id, the rosids/eurosids gene-gain case). Keep them when editing.

## Task Management

Create and maintain plan files in `.plans/<category>/<task-name>.md` for non-trivial work. See
[.plans/template.md](.plans/template.md) for the template, the recovery-checkpoint convention and the
categories (`bugfix`, `feature`, `refactor`, `config`, `docs`, `testing`, `misc`). On resume, read
the ACTIVE plans' Recovery Checkpoint first.

## Git Commits

- **Never** add `Co-Authored-By: Claude ...` trailers (or any Claude attribution) to commit messages.
- Keep messages short: a one-line subject plus a few brief bullets, not paragraphs.
