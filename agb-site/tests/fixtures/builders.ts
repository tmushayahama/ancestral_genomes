import type { SpeciesDetail, SpeciesRowWire } from '@/features/species/models/species'
import type { Gene, GeneListRow } from '@/features/genes/models/gene'

/**
 * Shapes here mirror real `159.89.146.180:3003` responses, including the fact
 * that every numeric column arrives as a string and that ancestral genes carry
 * the `NOT_AVAILABE` sentinel (sic) instead of a PANTHER identifier.
 */

export const buildSpeciesRow = (overrides: Partial<SpeciesRowWire> = {}): SpeciesRowWire => ({
  id: '129',
  taxon_id: '131567',
  short_name: 'LUCA',
  long_name: 'LUCA',
  parent_id: '',
  parent_short_name: '',
  timescale: '4290',
  gene_count: '3018',
  all_ancestors: [],
  ...overrides,
})

export const buildSpeciesDetail = (overrides: Partial<SpeciesDetail> = {}): SpeciesDetail => ({
  id: '129',
  short_name: 'LUCA',
  long_name: 'LUCA',
  taxon_id: '131567',
  parent_short_name: '',
  timescale: 4290,
  gene_count: 3018,
  all_ancestors: [],
  ...overrides,
})

export const buildGeneListRow = (overrides: Partial<GeneListRow> = {}): GeneListRow => ({
  ptn: 'PTN000000526',
  name: 'SODIUM-DEPENDENT PHOSPHATE TRANSPORT PROTEIN 2C-RELATED',
  pthr: 'PTHR10010',
  proxy_gene: 'HUMAN|HGNC=11019|UniProtKB=Q06495',
  ...overrides,
})

export const buildGene = (overrides: Partial<Gene> = {}): Gene => ({
  ptn: 'PTN000000526',
  name: 'SODIUM-DEPENDENT PHOSPHATE TRANSPORT PROTEIN 2C-RELATED',
  species_short: 'LUCA',
  species_long: 'LUCA',
  sequence: 'mkv..llg--ae_',
  event: 'SPECIATION',
  pthr: 'PTHR10010',
  family_name: 'SOLUTE CARRIER FAMILY 34  SODIUM PHOSPHATE , MEMBER 2-RELATED',
  longId: 'NOT_AVAILABE',
  proxy_genes: [],
  ...overrides,
})

export const buildProxyGene = (overrides: Partial<Gene['proxy_genes'][number]> = {}) => ({
  proxy_spe_short: 'ANOCA',
  proxy_spe_long: 'Anolis carolinensis',
  proxy_gene: 'ANOCA|Ensembl=ENSACAG00000006326|UniProtKB=G1KFC5',
  ...overrides,
})
