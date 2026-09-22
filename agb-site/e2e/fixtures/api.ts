import type { Page } from '@playwright/test'

/**
 * Hermetic stand-in for the AGB API so the suite does not depend on
 * `159.89.146.180:3003` being up. Payloads are copied from real responses,
 * including the fact that every numeric column arrives as a string and that
 * ancestral genes carry the `NOT_AVAILABE` sentinel (sic) in `longId`.
 */

const speciesRow = (over: Record<string, unknown>) => ({
  id: '1',
  taxon_id: '131567',
  short_name: 'LUCA',
  long_name: 'LUCA',
  parent_id: '',
  parent_short_name: '',
  timescale: '4290',
  gene_count: '3018',
  all_ancestors: [],
  ...over,
})

const SPECIES_ROWS = [
  speciesRow({}),
  speciesRow({
    id: '2',
    short_name: 'Eukaryota',
    long_name: 'Eukaryota',
    taxon_id: '2759',
    parent_id: '1',
    parent_short_name: 'LUCA',
    timescale: '1800',
    gene_count: '500',
    all_ancestors: [['4290', 'LUCA']],
  }),
  speciesRow({
    id: '3',
    short_name: 'HUMAN',
    long_name: 'Homo-Pan',
    taxon_id: '9606',
    parent_id: '2',
    parent_short_name: 'Eukaryota',
    timescale: '0',
    gene_count: '200',
    all_ancestors: [['1105', 'Eukaryota']],
  }),
]

const GENES = [
  {
    ptn: 'PTN000000526',
    name: 'SODIUM-DEPENDENT PHOSPHATE TRANSPORT PROTEIN 2C',
    pthr: 'PTHR10010',
    proxy_gene: 'HUMAN|HGNC=11019|UniProtKB=Q06495',
  },
  {
    ptn: 'PTN000000084',
    name: 'MANNOSYL-3-PHOSPHOGLYCERATE PHOSPHATASE',
    pthr: 'PTHR10000',
    proxy_gene: 'SCHPO|PomBase=SPBC215.10|UniProtKB=O94314',
  },
]

const GENE_DETAIL = {
  ptn: 'PTN000000526',
  name: 'SODIUM-DEPENDENT PHOSPHATE TRANSPORT PROTEIN 2C',
  species_short: 'LUCA',
  species_long: 'LUCA',
  sequence: 'mkv..llg--ae_',
  event: 'SPECIATION',
  pthr: 'PTHR10010',
  family_name: 'SOLUTE CARRIER FAMILY 34',
  longId: 'NOT_AVAILABE',
  proxy_genes: [
    {
      proxy_spe_short: 'ANOCA',
      proxy_spe_long: 'Anolis carolinensis',
      proxy_gene: 'ANOCA|Ensembl=ENSACAG00000006326|UniProtKB=G1KFC5',
    },
  ],
}

const envelope = (lists: unknown[], extra: Record<string, unknown> = {}) =>
  JSON.stringify({ success: true, lists, ...extra })

/** Longest path fragment wins, so specific routes beat generic prefixes. */
const ROUTES: Array<[string, string]> = [
  ['/genelist/species-list', envelope(SPECIES_ROWS)],
  ['/genelist/species-info/HUMAN', envelope([SPECIES_ROWS[2]])],
  ['/genelist/species-info/Eukaryota', envelope([SPECIES_ROWS[1]])],
  ['/genelist/species-info/', envelope([SPECIES_ROWS[0]])],
  ['/genelist/proxy_species/HUMAN', envelope([])],
  ['/genelist/proxy_species/', envelope(['Homo sapiens', 'Mus musculus'])],
  [
    '/genelist/gene_go/',
    envelope([{ paint_annotations: [{ go_accession: 'GO:0016301', go_name: 'kinase activity' }] }]),
  ],
  ['/genelist/gene/', envelope([GENE_DETAIL])],
  [
    '/genelist/gene-pass/',
    envelope(
      [
        {
          ptn: 'PTN000000538',
          name: 'SODIUM-DEPENDENT PHOSPHATE TRANSPORT PROTEIN 2A',
          descent_ptns: 'PTN002558327,PTN002558326',
          descent_gnames: 'HEAT SHOCK FACTOR X 3,HEAT SHOCK FACTOR X 4',
          descent_longIds: 'HUMAN|Ensembl=ENSG00000283697,HUMAN|Ensembl=ENSG00000283463',
        },
      ],
      { count: 1 }
    ),
  ],
  ['/genelist/gene-loss/', envelope([{ ptn: 'PTN900000717', name: 'NOT NAMED' }], { count: 1 })],
  [
    '/genelist/gene-gain/',
    envelope(
      [
        {
          ptn: 'PTN002542101',
          name: 'F-BOXWD REPEAT-CONTAINING PROTEIN 1A',
          proxy_gene: 'HUMAN|HGNC=1144|UniProtKB=Q9Y297',
        },
      ],
      { count: 1 }
    ),
  ],
  [
    '/genelist/gene-no-model/',
    envelope(
      [
        {
          ptn: 'PTN006873414',
          name: 'Putative uncharacterized protein LOC152225',
          proxy_gene: 'HUMAN|Gene=YC023_HUMAN|UniProtKB=Q0VG73',
        },
      ],
      { count: 1 }
    ),
  ],
  ['/genelist/species/', envelope(GENES, { total: GENES.length })],
]

export const stubAgbApi = async (page: Page) => {
  await page.route('**/genelist/**', async route => {
    const url = decodeURIComponent(route.request().url())
    const match = [...ROUTES]
      .sort((a, b) => b[0].length - a[0].length)
      .find(([fragment]) => url.includes(fragment))

    if (!match) {
      await route.fulfill({ status: 404, body: envelope([]) })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: match[1],
    })
  })
}
