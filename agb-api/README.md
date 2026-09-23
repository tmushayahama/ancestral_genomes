# Ancestral Genomes API

REST + GraphQL API over the ancestral-genomes MongoDB (`ancGenomesDB15`): reconstructed ancestral
genomes from PANTHER, their genes, and comparisons with their extant descendants. NestJS 11,
Mongoose 9, Apollo 5. Public and read-only.

It replaces the Express service in `agb_api_server`. The old `/genelist/*` routes are not carried
over; this API defines its own typed contract (see `/api/docs` and `src/schema.gql`).

## Run it

Requires Node 20.19+ and MongoDB ≥ 4.2 (the driver's minimum).

```bash
npm install
cp .env.example .env              # optional — every variable has a default
npm run start:dev                 # http://localhost:3004
```

With data (a `mongodump` of `ancGenomesDB15`):

```bash
mongorestore --gzip --archive=agb15.archive.gz --nsInclude="ancGenomesDB15.*"
npm run build
npm run cli -- db:indexes         # the app never builds indexes itself
npm run cli -- data:check         # report problems in the species tree
```

Or with Docker (MongoDB 7 + the API; put the dump in `./dump`):

```bash
docker compose up -d mongo
docker compose exec mongo mongorestore --gzip --archive=/dump/agb15.archive.gz
docker compose up -d --build api
docker compose exec api node dist/cli db:indexes
```

## Endpoints

Interactive docs: **`/api/docs`** (OpenAPI JSON at `/api/docs-json`). GraphiQL at `/graphql` in dev.

| GET                                             | Returns                                                         |
| ----------------------------------------------- | --------------------------------------------------------------- |
| `/api/health`                                   | `{ status, db }` (503 when the database is down)                |
| `/api/stats`                                    | species and gene counts                                         |
| `/api/species`                                  | every species, flat (`treeParentId` nests it)                   |
| `/api/species/tree`                             | the species tree, nested                                        |
| `/api/species/:name`                            | one species — short or long name, e.g. `HUMAN`, `Homo%20sapiens` |
| `/api/species/:name/genes?proxy=&offset=&limit=` | a genome; `proxy` = an extant descendant                       |
| `/api/species/:name/proxy-species`              | extant species that can stand in for an ancestral genome        |
| `/api/species/:name/unmodelled-genes`           | genes of an extant species no PANTHER family models             |
| `/api/genes/:ptn`                               | one gene, with its reconstructed sequence and proxy genes       |
| `/api/genes/:ptn/annotations`                   | GO (PAINT) annotations — 503 until a source is configured       |
| `/api/comparisons/:ancestral/:extant`           | the pair and its counts                                         |
| `/api/comparisons/:ancestral/:extant/inherited` | ancestral genes with their descendants                          |
| `/api/comparisons/:ancestral/:extant/lost`      | ancestral genes with no descendant                              |
| `/api/comparisons/:ancestral/:extant/gained`    | extant genes that arose after the ancestral genome              |

Collections are `{ total, offset, limit, items }`; omit `limit` to get every row. Errors are
`{ statusCode, message, error }`.

```graphql
{
  comparison(ancestral: "Homo-Pan", extant: "HUMAN") {
    counts { inherited descendants lost gained unmodelled }
    gained(limit: 10) { items { ptn name pantherId } }
  }
}
```

GraphQL limits: depth 8, a complexity budget, and at most 10,000 rows per list field — use REST
for bulk lists.

## Test

```bash
npm test                  # unit
npm run test:integration  # on mongodb-memory-server (first run downloads mongod)
npm run lint && npm run typecheck
```

See [CLAUDE.md](CLAUDE.md) for the architecture and conventions, and
[.plans/refactor/express-to-nestjs-port.md](.plans/refactor/express-to-nestjs-port.md) for the port:
legacy behaviour, the faults it fixes, and the open items.
