# Ancestral Genomes (agb-site)

React front end for the [Ancestral Genomes](http://www.ancestralgenomes.org/) resource — browse
reconstructed ancestral genomes and their protein-coding genes across the tree of life.

Replaces the Angular 6 app in `panther/panther_agb`. It reads from the AGB Express/Mongo service
(`panther/agb_api_server`, mirrored into `../agb-api`).

## Getting started

```bash
npm install
npm run dev          # http://localhost:4210
```

`VITE_AGB_API_URL` points at the API. `.env.development` defaults to `http://localhost:3003`,
which is the port `agb_api_server/app.js` listens on.

## Commands

| Command              | What it does                          |
| -------------------- | ------------------------------------- |
| `npm run dev`        | Vite dev server on port 4210          |
| `npm run build`      | `tsc -b` then a production Vite build |
| `npm test`           | Vitest (specs under `tests/`)         |
| `npm run test:e2e`   | Playwright (specs under `e2e/`)       |
| `npm run lint`       | ESLint                                |
| `npm run format`     | Prettier                              |
| `npm run type-check` | `tsc --noEmit`                        |

## Stack

React 19 · TypeScript · Vite 6 · Redux Toolkit + RTK Query · Mantine v9 · Tailwind CSS v4 ·
React Router 7 · TanStack Table · Vitest + Testing Library · Playwright

See [CLAUDE.md](CLAUDE.md) for the architecture and the conventions this repo enforces, and
[.plans/](.plans) for in-flight work.
