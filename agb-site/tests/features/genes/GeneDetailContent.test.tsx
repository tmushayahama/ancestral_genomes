import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import GeneDetailContent from '@/features/genes/components/GeneDetailContent'
import { renderWithProviders } from '@tests/test-utils'
import { buildGene, buildProxyGene } from '@tests/fixtures/builders'
import { envelope, requestedUrls, stubAgbApi } from '@tests/fixtures/apiStub'

const ANCESTRAL = buildGene({
  ptn: 'PTN001',
  name: 'Ancestral kinase',
  species_short: 'Eukaryota',
  species_long: 'Eukaryota',
  pthr: 'PTHR1',
  family_name: 'Kinase family',
  sequence: 'mkv..llg--ae_',
  proxy_genes: [buildProxyGene({ proxy_spe_long: 'Homo sapiens', proxy_gene: 'HUMAN|HGNC=1' })],
})

const EXTANT = buildGene({
  ptn: 'PTN999',
  name: 'Human kinase',
  species_short: 'HUMAN',
  species_long: 'Homo sapiens',
  longId: 'HUMAN|HGNC=1',
  proxy_genes: [],
})

const ANNOTATIONS = [
  { go_accession: 'GO:0003674', go_name: 'molecular_function' },
  { go_accession: 'GO:0016301', go_name: 'kinase activity' },
]

describe('GeneDetailContent', () => {
  it('labels an ancestral gene and shows its reconstructed sequence stripped of padding', async () => {
    stubAgbApi({
      '/genelist/gene_go/': envelope([{ paint_annotations: ANNOTATIONS }]),
      '/genelist/gene/': envelope([ANCESTRAL]),
    })
    renderWithProviders(<GeneDetailContent ptn="PTN001" />)

    expect(await screen.findByText('Inferred ancestral protein name')).toBeInTheDocument()
    expect(screen.getByText('Inferred ancestral protein sequence')).toBeInTheDocument()
    expect(screen.getByText('MKVLLGAE')).toBeInTheDocument()
  })

  it('labels an extant gene differently and links the name to PANTHER', async () => {
    stubAgbApi({ '/genelist/gene/': envelope([EXTANT]) })
    renderWithProviders(<GeneDetailContent ptn="PTN999" />)

    expect(await screen.findByText('Extant protein name')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Human kinase' })).toHaveAttribute(
      'href',
      'http://pantherdb.org/genes/gene.do?acc=HUMAN|HGNC=1'
    )
  })

  it('renders the GO annotations with AmiGO links', async () => {
    stubAgbApi({
      '/genelist/gene_go/': envelope([{ paint_annotations: ANNOTATIONS }]),
      '/genelist/gene/': envelope([ANCESTRAL]),
    })
    renderWithProviders(<GeneDetailContent ptn="PTN001" />)

    expect(await screen.findByRole('link', { name: 'GO:0016301' })).toHaveAttribute(
      'href',
      'http://amigo.geneontology.org/amigo/term/GO:0016301'
    )
  })

  it('does not request GO annotations for an extant gene, which never has them', async () => {
    const fetchMock = stubAgbApi({ '/genelist/gene/': envelope([EXTANT]) })
    renderWithProviders(<GeneDetailContent ptn="PTN999" />)

    await screen.findByText('Extant protein name')

    expect(requestedUrls(fetchMock).some(url => url.includes('/genelist/gene_go/'))).toBe(false)
    expect(screen.queryByText(/Gene Ontology annotations/)).not.toBeInTheDocument()
  })

  it('links through to the family tree viewer route', async () => {
    stubAgbApi({
      '/genelist/gene_go/': envelope([{ paint_annotations: [] }]),
      '/genelist/gene/': envelope([ANCESTRAL]),
    })
    renderWithProviders(<GeneDetailContent ptn="PTN001" />)

    expect(
      await screen.findByRole('link', { name: 'View gene within family tree' })
    ).toHaveAttribute('href', '/genes/gene-tree/PTHR1/PTN001')
  })

  it('reports a failed load rather than rendering empty cards', async () => {
    stubAgbApi({ '/genelist/gene/': envelope([]) }, { failing: ['/genelist/gene/'] })
    renderWithProviders(<GeneDetailContent ptn="PTN001" />)

    expect(await screen.findByText('Could not load gene PTN001.')).toBeInTheDocument()
  })
})
