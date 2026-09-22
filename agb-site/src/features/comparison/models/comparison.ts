/**
 * Ancestral genes that survive into the extant genome. The API returns the
 * descendant columns as comma-joined strings; the slice splits them into
 * arrays so the table can render rows instead of `innerHTML`-ing `<br>` tags.
 */
export interface InheritedGene {
  ptn: string
  name: string
  descentPtns: string[]
  descentGeneNames: string[]
  descentLongIds: string[]
}

/** Ancestral genes with no descendant in the extant genome. */
export interface LostGene {
  ptn: string
  name: string
}

/** Extant genes with no counterpart in the ancestral genome. */
export interface GainedGene {
  ptn: string
  name: string
  /** PANTHER identifier of the extant gene. */
  proxy_gene?: string
}

/** Extant genes that were never modelled in a reconciled gene tree. */
export interface UnmodeledGene {
  ptn: string
  name: string
  /** PANTHER identifier of the extant gene. */
  proxy_gene?: string
}

/** Counts shown on the four accordion headers. */
export interface ComparisonCounts {
  inheritedAncestralGenes: number
  inheritedDescendantGenes: number
  lost: number
  gained: number
  unmodeled: number
}

/** The old templates rendered a bare `1` for unnamed proteins. */
export const displayProteinName = (name: string) => (name === '1' ? 'NOT_NAMED' : name)

/** Total extant genes reached across every inherited ancestral gene. */
export const countDescendants = (genes: InheritedGene[]) =>
  genes.reduce((total, gene) => total + gene.descentPtns.length, 0)
