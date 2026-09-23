# Problems with the current AGB API server

**What:** `agb_api_server` — the Express/Mongo service behind Ancestral Genomes
([github.com/pantherdb/agb_api_server](https://github.com/pantherdb/agb_api_server), local copy at
`C:/work/panther/agb_api_server`), deployed at `http://159.89.146.180:3003`.
**Reviewed:** 2026-09-22, by reading the code and probing the live service (details in
[How this was checked](#how-this-was-checked)).
**Replacement:** `../agb-api` (NestJS). The last column of each table says where the fix lives.

## Summary

1. **One request crashes the whole server.** `GET /genelist/gene_go/<anything>` throws outside
   Express's error handling and kills the Node process: every request in flight fails and the cache
   is wiped. The site sends this request on every ancestral gene view.
2. **The "genes gained" comparison returns wrong results.** Ancestor names are matched as
   substrings, so `rosids` also matches `eurosids`. Arabidopsis vs rosids reports 132 gained genes;
   the correct number is 219. The same code path is also a regex-injection hole.
3. **38 species (22 extant, Arabidopsis among them) are unreachable in the species tree.** Three
   parent nodes are missing from the `species` collection, and the API passes the broken links
   straight through.
4. **65 vulnerable dependencies (18 critical, 33 high),** on a stack that has had no changes since
   May 2020 (Express 4.15, Mongoose 4.11, the deprecated `request`).
5. **Cold list requests take 2–21 seconds** (the heaviest payload is 4.8 MB, uncompressed). The only
   mitigation is an in-memory cache that problem 1 keeps wiping.
6. **The GO annotations feature is dead.** It scrapes pantree.org, which now answers 403 to
   everything.

## Severity overview

| #   | Problem                                                     | Severity | Area                  | Fixed in `agb-api` by                                                             |
| --- | ----------------------------------------------------------- | -------- | --------------------- | ---------------------------------------------------------------------------------- |
| 1   | `gene_go` crashes the process                               | Critical | Availability          | No scraping; annotations come from a configured source, 503 when none            |
| 2   | Gene gain uses substring matching (`rosids` ⊂ `eurosids`)   | High     | Scientific correctness | Exact-name match (`exactNameRegExp`)                                              |
| 3   | Unescaped user input compiled into a regex                  | High     | Security              | Input escaped; names resolved to known species before querying                   |
| 4   | 65 vulnerable dependencies, EOL stack                       | High     | Security              | Current stack; `npm audit` at 0                                                   |
| 5   | 38 species unreachable in the tree                          | High     | Data                  | `treeParentId` re-attaches orphans; `data:check` reports them                     |
| 6   | Cold requests of 2–21 s, cache lost on every crash          | High     | Performance           | Declared indexes, `lean()`, bounded result cache with request de-duplication, gzip |
| 7   | No rate limiting on expensive endpoints                     | Medium   | Availability          | Per-IP throttling                                                                 |
| 8   | GO annotation source (pantree.org) is gone                  | Medium   | Feature               | Pluggable source; needs a decision on where annotations come from                |
| 9   | Errors returned as HTTP 200, raw driver errors leaked       | Medium   | API                   | Real status codes, generic error bodies                                          |
| 10  | Whole result sets written to stdout on every request        | Medium   | Performance           | One access-log line per request                                                  |
| 11  | No `Content-Type`, pretty-printed JSON, no compression      | Medium   | API / performance     | Standard JSON responses, gzip                                                     |
| 12  | Paging parameters not validated                             | Low      | API                   | Validated `offset`/`limit`                                                        |
| 13  | Wire-format quirks (numbers as text, sentinels, CSV-in-JSON) | Low     | API design            | Typed contract                                                                    |
| 14  | Dead code, schema drift, hard-coded config, no tests        | Low      | Maintainability       | New codebase                                                                      |
| 15  | Plain HTTP on a bare IP                                     | Low      | Deployment            | Deployment task: TLS via reverse proxy                                            |

## 1. Availability

### 1.1 `gene_go` crashes the whole process (Critical)

`controllers/genelist.js:168–223` fetches `http://pantree.org/node/annotationNode.jsp?id=<ptn>` with
`request`, then parses the HTML inside the callback:

```js
// controllers/genelist.js:177–180
if (html.indexOf('Unable to retrieve family information at this time for null') == -1) {
    var section = html.split('Direct Annotations to this node')[1];      // undefined on a 403 page
    var direct_annot_sec = section.split('Annotations inherited by this node')[0];  // TypeError
```

pantree.org now serves a 403 page, so `section` is `undefined` and the next line throws. The
callback runs outside Express's request handling, so the exception is uncaught and Node exits.

**Observed on 2026-09-22.** One `gene_go` request was sent alongside seven other requests. All eight
died within 0.6 s with "empty reply from server" (curl exit 52). The service came back within
seconds, so something restarts it (pm2, forever or systemd; which one is unknown).

**Consequences**

- **A trivial remote denial of service.** Anyone can take the API down with one unauthenticated GET,
  as often as they like.
- **Every restart also empties `apicache`,** the only thing that makes the slow lists tolerable (see
  §3). That is very likely why users so often hit the 8–9 s cold loads.
- **Normal browsing triggers it.** The React site requests `gene_go` for every ancestral gene it
  shows, and so did the Angular site.

### 1.2 No rate limiting (Medium)

- **Nothing limits request rates.** Several endpoints cost 10–20 s of database work when cold
  (§3.1), so a handful of concurrent requests for different species pairs keeps the server busy.
- **There is no timeout on queries** (no `maxTimeMS`).

### 1.3 The GO annotations source is gone (Medium)

- **pantree.org answers 403** to every URL, including its root, so the endpoint could not return
  annotations even if the crash were fixed.
- **The site shows none.** It displays "GO annotations are unavailable", whenever the process
  survives long enough to say so.
- **The database has slots for them.** The `genelists` documents carry `direct_paint_annotations`,
  `inherited_paint_annotations` and `paint_annotations` arrays, but they were empty in every
  document sampled. The data needs a new source.

## 2. Correctness

### 2.1 "Genes gained" matches ancestor names as substrings (High)

```js
// models/short_list.js:43
{'ancestor_species': {$not: new RegExp(anspecies)}, 'pthr': {$not: /NOT_AVAILABLE/}},
```

`new RegExp('rosids')` also matches `eurosids`. So genes that arose at eurosids, which is after
rosids, are treated as "existed at rosids" and disappear from the gained list.

**Measured.** In any comparison, an extant genome splits into three parts: descendants of the
ancestral genes, genes gained since, and unmodelled genes. The three should add up to the same total
whichever ancestor is chosen. For Arabidopsis (ARATH):

| Compared with              | Descendants | Gained  | Unmodelled | Sum        |
| -------------------------- | ----------- | ------- | ---------- | ---------- |
| Brassicaceae (control)     | 24,411      | 51      | 2,966      | 27,428     |
| malvids (control)          | 24,330      | 132     | 2,966      | 27,428     |
| rosids (affected)          | 24,243      | **132** | 2,966      | **27,341** |

`gene-gain/rosids/ARATH` returns exactly the same 132 genes as `gene-gain/malvids/ARATH`; it should
return 219, so 87 genes are missing.

**Affected pairs.** rosids against its 15 extant descendants: ARATH, BRANA, BRARP, CITSI, CUCSA,
EUCGR, GOSHI, JUGRE, MANES, MEDTR, POPTR, PRUPE, RICCO, SOYBN and THECC. The same substring pattern
exists for Firmicutes and Firmicutes-Tenericutes, but that one is probably harmless, because
Firmicutes-Tenericutes is likely the older node. It needs confirming against the data.

### 2.2 Minor logic slips

- **The `$or` in `getListByProxySpecies` has two identical branches** (`models/list_flat.js:37`). The
  second was presumably meant to match the proxy by short name, so today a proxy only works by long
  name.
- **`[...new Set(lists)]` never removes anything** (`controllers/genelist.js:236, 263, 289, 307, 324`).
  It de-duplicates Mongoose documents by object identity, not by value. No duplicate rows were found
  in seven sampled responses, so nothing is currently wrong, but the code does not do what it looks
  like.
- **The comparison `count` is the length of the returned page,** not the total, whenever `page` and
  `limit` are sent.
- **Two numbers in one proxy response come from different collections.** In
  `/genelist/species/:species/:proxy`, the `total` is counted in `short_genelists` while the rows
  come from `flat_genelists`.

## 3. Performance

### 3.1 Slow cold queries

These are seven parallel requests made right after a restart, with the cache empty:

| Request                                        | Time   | Size (as sent) |
| ---------------------------------------------- | ------ | -------------- |
| `species/LUCA/default species`                 | 2.0 s  | 0.58 MB        |
| `gene-gain/Homo-Pan/HUMAN`                     | 3.8 s  | 0.9 KB         |
| `gene-no-model/HUMAN`                          | 4.2 s  | 0.15 MB        |
| `species/HUMAN/default species`                | 7.1 s  | 3.66 MB        |
| `gene-loss/Homo-Pan/HUMAN`                     | 16.0 s | 0.10 MB        |
| `species/LUCA/Homo sapiens` (proxy list)       | 16.2 s | 0.52 MB        |
| `gene-pass/Homo-Pan/HUMAN`                     | 21.2 s | 4.81 MB        |

- **Sequential requests are no better.** `gene-pass` for Arabidopsis pairs took 9.6–10.5 s each.
  Once cached, the same requests take 0.28–0.61 s.
- **Likely causes** (index definitions could not be checked without database access):
  - **Unindexed queries, probably.** The `$or` filters over short and long names force a collection
    scan on any branch that lacks an index.
  - **Full hydration.** Every document is turned into a full Mongoose object (no `lean()`).
  - **A synchronous stdout dump,** described in §3.3.

### 3.2 The cache cannot be relied on

`apicache` keeps whole HTTP responses in process memory:

- **It has no size bound.** One `gene-pass` entry is 4.8 MB.
- **It is lost on every restart,** and §1.1 causes restarts constantly.
- **Concurrent cold requests are not coalesced.** Ten simultaneous requests for the same cold URL run
  the same 20-second query ten times.

### 3.3 Result sets written to stdout

`console.log(lists)` prints every row of every non-default proxy gene list
(`controllers/genelist.js:97`, and twice in `direct-inherited`, lines 323 and 334). That is
thousands of Mongoose documents written synchronously per request. It is a plausible part of why the
proxy list above takes 16 s against 2 s for the default list.

### 3.4 Heavy payloads

- **No `Content-Type` is sent.** Responses are written with
  `res.write(JSON.stringify(..., null, 2))`, so they carry no `Content-Type` header. PowerShell's
  `Invoke-WebRequest`, for one, hands the body back as raw bytes.
- **The JSON is pretty-printed** with 2-space indentation.
- **Nothing is compressed.** Compact JSON plus gzip would cut transfer about 8×:

| Response                   | Sent today | Compact | Compact + gzip |
| -------------------------- | ---------- | ------- | -------------- |
| `gene-pass/Homo-Pan/HUMAN` | 4.81 MB    | 3.87 MB | 0.61 MB        |
| HUMAN gene list            | 3.66 MB    | 2.79 MB | 0.49 MB        |
| `species-list`             | 230 KB     | 110 KB  | ~10 KB         |

## 4. Security

### 4.1 User input compiled into a regex (High)

`new RegExp(anspecies)` (`models/short_list.js:43`) builds a regex straight from the URL and runs it
on the database server against every candidate document.

- **It can change what the query means.** `.*` matches every lineage, so the endpoint returns
  nothing.
- **It can burn database CPU.** A pattern with nested quantifiers backtracks catastrophically.

No other route builds a regex from input.

### 4.2 Vulnerable, end-of-life dependencies (High)

`npm audit` on the committed `package-lock.json` found 65 vulnerable packages: 18 critical, 33 high,
11 moderate and 3 low, across 98 advisories. The ones on the live request path:

| Package                                 | Worst  | Examples                                                                                   |
| --------------------------------------- | ------ | ------------------------------------------------------------------------------------------ |
| `mongoose` 4.11 (+ `mquery`, `mpath`, `bson`) | critical | prototype pollution via `Schema.path`, search injection, NoSQL injection via `$nor`, BSON deserialisation |
| `express` 4.15 (+ `qs`, `send`, `path-to-regexp`) | high | `qs` prototype pollution, open redirect, `path-to-regexp` ReDoS (the app's own routes don't use the vulnerable pattern) |
| `body-parser` 1.17                      | high   | denial of service with URL-encoding enabled (the app enables it)                           |
| `request` / `request-promise`           | critical | via a vulnerable `form-data`, plus an SSRF advisory; the package is deprecated and unmaintained since 2020 |

How reachable each one is varies. Several need features the app doesn't use; for example, Mongoose's
search-injection advisory needs `populate` with `$where`. But the whole line is years out of support,
and none of it can be patched without major-version upgrades. Many of the remaining advisories (`tar`,
`chokidar`, `fsevents` and others) arrive through `nodemon`, a development tool listed under
production `dependencies`. The last commit to the repository was 2020-05-21.

### 4.3 Information leaks (Medium)

- **Raw error text in responses.** Database errors are returned to clients verbatim, for example
  `Failed to get total gene counts. Error: ${err}` (`controllers/genelist.js:52`).
- **Framework disclosure.** Every response carries `X-Powered-By: Express`.

### 4.4 What is fine

- **The database is not exposed.** MongoDB's port 27017 on the host is closed to the internet.
- **Open CORS is appropriate.** `Access-Control-Allow-Origin: *` suits public, read-only data.

## 5. API design problems

These don't break anything today, but every client has to work around them. The React site carries
code for each one.

- **Every number is a string:** `id`, `taxon_id`, `timescale`, `gene_count`, `parent_id`, and the
  ages inside `all_ancestors`.
- **Sentinel values stand in for "none".** They include `NOT_AVAILABLE`; `NOT_AVAILABE` (a typo that
  lives in the data) for a gene's PANTHER id; `NOT NAMED` for a protein name; `""` for the root's
  parent and for missing taxon ids; and `default species`, a proxy value with a space in it that
  travels inside a URL path segment.
- **Lists are packed into strings.** Descendant genes arrive as three parallel comma-joined strings
  (`descent_ptns`, `descent_gnames`, `descent_longIds`), which clients must split and zip.
- **Errors are HTTP 200.** A database error is `200 { success: false }`, and a missing item is
  `200 { success: true, lists: [] }`, so clients cannot tell failure from absence by status code.
- **Paging is not validated.**
  - With no `page`/`limit`, `parseInt` yields `NaN` and the server returns everything.
  - With `page=0` or a negative page, it computes a negative `skip`, and the database errors.
  - Non-numeric values are silently ignored.
- **Row order is undefined.** No query sorts, so page contents are not stable.
- **Two undocumented routes.** `/genelist/direct-inherited/:species` is used by neither site and
  logs its results twice. `/genelist/species/:species` (no proxy) is not cached, unlike its sibling.

## 6. Data problems the server passes through

These live in the database (`ancGenomesDB15`), not the code. The server returns them as-is, and the
site inherits them. Figures are from the live `species-list` (255 rows).

1. **38 species are unreachable from the root (LUCA),** 22 of them extant: ARATH, BACCR, BACSU,
   BRANA, BRARP, CITSI, CLOBH, CUCSA, EUCGR, GOSHI, JUGRE, LISMO, MANES, MEDTR, MYCGE, POPTR, PRUPE,
   RICCO, SOYBN, STAA8, STRR6 and THECC.
   - **Cause.** Three `parent_id` values point at rows that don't exist:

     | Missing parent id | Its children in the data | Probably                |
     | ----------------- | ------------------------ | ----------------------- |
     | 254               | fabids, malvids          | eurosids                |
     | 101               | Firmicutes, MYCGE        | Firmicutes-Tenericutes  |
     | 38                | BRANA, BRARP             | a *Brassica* node       |

     The "probably" names come from those species' `all_ancestors` lists; they need confirming
     against the data.
   - **Effect.** Any client that builds the tree from `parent_id` silently drops these subtrees.
     The React site's species tree does not show *Arabidopsis thaliana*.
2. **`eudicotyledons` is an internal node stored with `timescale: "0"`.** Zero is the marker for
   extant species, so treating "timescale 0" as "extant" misclassifies it.
   - By timescale the data has 111 ancestral and 144 extant species; by tree shape it has 112 and
     143.
3. **Four species are older than their parent:**
   - Brassicaceae (104 mya) under Brassicales-Malvales (91)
   - Dictyostelium (2101) under Amoebozoa (1480)
   - Excavates (2101) under Bikonts (1660)
   - SAR/HA_supergroup (1768) under Bikonts (1660)
4. **`all_ancestors` is ordered by age, not by lineage.** Tied and blank ages reorder it, so 157 of
   the 255 rows differ from their `parent_id` chain. The missing nodes appear with blank ages.
5. **29 nodes have no `taxon_id`,** mostly composite clades such as Homo-Pan, Archaea-Eukaryota and
   Bikonts. Any NCBI Taxonomy link built from the id is broken for them.
6. **The site's release page no longer matches the data.**

   |                        | PANTHER | Species (ancestral / extant) | Genes (ancestral / extant) |
   | ---------------------- | ------- | ---------------------------- | -------------------------- |
   | Site's release page    | 14.1    | 111 / 132                    | 1,210,026 / 2,256,854      |
   | The data, by tree shape | —      | 112 / 143                    | 1,424,809 / 2,625,353      |

## 7. Maintainability and operations

- **Hard-coded configuration.** The port (`app.js:23`, `3003`) and the database URL
  (`config/database.js:3`) are in the code. There is no environment handling.
- **The deployed client points at the wrong port.** The Angular site's `environment.ts` targets port
  `3002`, which is closed; only `3003` is live.
- **Next to no tests or tooling.** There are no tests, no linting, and no logging beyond
  `console.log`/`console.error`, and the README has four lines.
- **The Mongoose schemas don't match the data.**
  - `species` declares `name` and `parent`, which the data doesn't have, and misses `id`,
    `parent_id`, `parent_short_name` and `all_ancestors`, which it does.
  - `flat_genelists` filters on `pthr` without declaring it, and declares the misspelt
    `descnet_gnames`.
  - Three models use a schema-less `{ any: {} }`.
- **Dead code and dependencies.**
  - `cheerio`, `flat-cache` and `memory-cache` are installed but unused.
  - `nodemon` is listed as a production dependency.
  - `express.static('public')` serves a folder that does not exist.
  - There is commented-out code throughout.
- **The history is unreadable.** 137 of the 241 commits are titled "update", "test", "tt" or
  similar, so it cannot explain why the code is the way it is.
- **Plain HTTP on a bare IP.** If the site moves to HTTPS, browsers will block calls to this API as
  mixed content.

## Could not be verified (no database access)

| Question                                            | Why it matters                                                                   |
| --------------------------------------------------- | -------------------------------------------------------------------------------- |
| Which indexes exist                                 | Confirms the cause of §3.1                                                       |
| The MongoDB server version                          | Mongoose 4.11 dates from the MongoDB 3.x era; current drivers need MongoDB ≥ 4.2 |
| How `ancestor_species` is delimited                 | Needed to confirm the §2.1 fix on the real data                                  |
| Which process manager restarts the service          | Operations and cut-over planning                                                 |
| Whether anything else calls `direct-inherited`      | Access logs would show it before it is retired                                   |

A `mongodump` of `ancGenomesDB15` and the server's `mongod --version` would answer all but the last
two.

## How this was checked

- **The code,** at `agb_api_server@ee8786c` ("change port number", 2020-05-21).
- **The live service,** probed with `curl` on 2026-09-22: every route, timings cold and warm,
  headers, and error cases. These requests were read-only, but one `gene_go` probe crashed the
  server (§1.1); it restarted by itself within seconds, and `gene_go` was not called again.
- **The partition check (§2.1)** compared `gene-pass`, `gene-gain` and `gene-no-model` for
  ARATH against three ancestors.
- **The data checks (§6)** ran over the live `species-list` response.
- **The dependency audit (§4.2)** was `npm audit --package-lock-only` on the committed lockfile.
  Nothing was installed or changed in the legacy repository.

The full working notes (fixes, fixtures, open decisions) are in
[`agb-api/.plans/refactor/express-to-nestjs-port.md`](../agb-api/.plans/refactor/express-to-nestjs-port.md).
