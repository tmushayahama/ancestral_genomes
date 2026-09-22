import type { TimescaleBucket } from '@/@agb.core/data/timescale'

/**
 * `[millionsOfYearsAgo, ancestorShortName]`. Both arrive as strings, and the
 * age can be fractional ("6.65" for Homo-Pan).
 */
export type AncestorEntry = [string, string]

/**
 * A row exactly as `/genelist/species-list` and `/genelist/species-info`
 * return it. Mongo stores every numeric column as a string, so this wire type
 * says so; the slices coerce in `transformResponse` and nothing downstream
 * sees it.
 */
export interface SpeciesRowWire {
  id: string
  taxon_id: string
  short_name: string
  long_name: string
  parent_id: string
  parent_short_name: string
  timescale: string
  gene_count: string
  all_ancestors?: AncestorEntry[]
}

/** `SpeciesRowWire` with numbers parsed, nested, and colour-coded. */
export interface SpeciesNode {
  id: string
  taxon_id: string
  short_name: string
  long_name: string
  parent_id: string
  timescale: number
  gene_count: number
  timescaleBucket: TimescaleBucket
  children: SpeciesNode[]
  /** Depth from the root, filled while nesting so the tree can indent. */
  level: number
}

/** `/genelist/species-info/:species`, with numbers parsed. */
export interface SpeciesDetail {
  id: string
  short_name: string
  long_name: string
  taxon_id: string
  parent_short_name: string
  timescale: number
  gene_count: number
  /** Present on every species; only non-empty below the root. */
  all_ancestors: AncestorEntry[]
}

/** An extant species is one whose speciation time is zero. */
export const isExtant = (species: Pick<SpeciesDetail, 'timescale'>) => species.timescale === 0

export const toSpeciesDetail = (row: SpeciesRowWire): SpeciesDetail => ({
  id: row.id,
  short_name: row.short_name,
  long_name: row.long_name,
  taxon_id: row.taxon_id,
  parent_short_name: row.parent_short_name,
  timescale: Number(row.timescale),
  gene_count: Number(row.gene_count),
  all_ancestors: row.all_ancestors ?? [],
})
