/** A row in the species gene list (`/genelist/species/:species/:proxySpecies`). */
export interface GeneListRow {
  ptn: string
  name: string
  pthr: string
  proxy_gene?: string
}

/** The proxy of an ancestral gene in one extant species. */
export interface ProxyGene {
  proxy_spe_short: string
  proxy_spe_long: string
  proxy_gene: string
}

/** A GO term painted onto an ancestral gene (scraped from PANTREE by the API). */
export interface PaintAnnotation {
  go_accession: string
  go_name: string
}

/** `/genelist/gene/:ptn`. */
export interface Gene {
  ptn: string
  name: string
  species_short: string
  species_long: string
  sequence: string
  event: string
  pthr: string
  family_name: string
  /**
   * PANTHER identifier of the gene itself. Ancestral genes are extinct and so
   * have none; the database marks that with a literal sentinel rather than
   * omitting the field.
   */
  longId?: string
  proxy_genes: ProxyGene[]
}

/** Both spellings appear in the data — the shorter one is a typo upstream. */
const NO_PANTHER_ID = new Set(['NOT_AVAILABE', 'NOT_AVAILABLE', ''])

/**
 * The gene's own PANTHER identifier, or undefined when it has none.
 *
 * The old Angular templates read `gene.leaf_seq_id`, a field the API does not
 * return, so the "link the protein name to PANTHER" branch never fired on the
 * live site. `longId` is the real field.
 */
export const pantherGeneId = (gene: Pick<Gene, 'longId'>): string | undefined =>
  gene.longId && !NO_PANTHER_ID.has(gene.longId) ? gene.longId : undefined

/**
 * Reconstructed sequences carry alignment padding. The Angular code stripped
 * it inline in three different components; it belongs with the model.
 */
export const cleanSequence = (sequence?: string) =>
  (sequence ?? '').replace(/[._-]/g, '').toUpperCase()

/** A gene with proxies is ancestral; without, the row is an extant gene. */
export const isAncestral = (gene: Pick<Gene, 'proxy_genes'>) => (gene.proxy_genes?.length ?? 0) > 0
