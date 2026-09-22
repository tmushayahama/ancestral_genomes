type AppEnv = 'dev' | 'beta' | 'prod'

const appEnv: AppEnv = (import.meta.env.VITE_APP_ENV ?? 'dev') as AppEnv

export const ENVIRONMENT = {
  appEnv,
  isDev: appEnv === 'dev',
  isBeta: appEnv === 'beta',
  isProd: appEnv === 'prod',

  /** Express/Mongo service that fronts the ancestral-genomes database. */
  agbApiUrl: import.meta.env.VITE_AGB_API_URL ?? 'http://159.89.146.180:3003',

  /** Embedded PANTHER family-tree viewer (rendered in an iframe). */
  geneTreeViewerUrl: 'http://panthertest6.med.usc.edu:8086/treeViewer/treeViewer.jsp',
}

/**
 * Every off-site destination the old Angular templates hard-coded inline.
 * Builders take an accession so callers never string-concatenate URLs.
 */
export const EXTERNAL_LINKS = {
  PANTHER_HOME: 'http://www.pantherdb.org/',
  TREE_OF_LIFE: 'http://tolweb.org/',
  WIKIPEDIA: 'https://en.wikipedia.org/wiki/',
  CONTACT_EMAIL: 'ancestralgenomes@gmail.com',
  CITATION_DOI: 'https://doi.org/10.1093/nar/gky1009',
  /** Full CSV dump of ancestral + extant genes, served from Zenodo. */
  ALL_GENES_DOWNLOAD:
    'https://zenodo.org/record/3376677/files/AncestralAndExtantGenes.csv.gz?download=1',
}

export const externalUrl = {
  pantherGene: (acc: string) => `http://pantherdb.org/genes/gene.do?acc=${acc}`,
  pantherFamily: (pthr: string) =>
    `http://www.pantherdb.org/panther/family.do?clsAccession=${pthr}`,
  amigoTerm: (goId: string) => `http://amigo.geneontology.org/amigo/term/${goId}`,
  ncbiTaxonomy: (taxonId: string | number) =>
    `https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?mode=Info&id=${taxonId}&lvl=3&lin=f&keep=1&srchmode=1&unlock`,
  treeOfLife: (name: string) => `${EXTERNAL_LINKS.TREE_OF_LIFE}${name}`,
  wikipedia: (name: string) => `${EXTERNAL_LINKS.WIKIPEDIA}${name}`,
}

/**
 * Sentinel the API uses for "no specific proxy species selected" — it is a
 * literal database value, not a display string, so it has to survive round
 * trips through the URL. The old site put it in a path segment (with a space
 * in it); here it lives in the `?proxy=` query param.
 */
export const DEFAULT_PROXY_SPECIES = 'default species'

/** Root ancestral node — the landing destination for "browse". */
export const ROOT_SPECIES = 'LUCA'
