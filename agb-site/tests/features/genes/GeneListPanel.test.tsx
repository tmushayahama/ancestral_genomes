import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import GeneListPanel from '@/features/genes/components/GeneListPanel'
import { DialogComponent } from '@/@agb.core/components/dialog/dialogSlice'
import { renderWithProviders } from '@tests/test-utils'
import { buildGeneListRow, buildSpeciesRow } from '@tests/fixtures/builders'
import { envelope, requestedUrls, stubAgbApi } from '@tests/fixtures/apiStub'

const GENES = [
  buildGeneListRow({ ptn: 'PTN001', name: 'Kinase', pthr: 'PTHR1', proxy_gene: 'HUMAN|X' }),
  buildGeneListRow({ ptn: 'PTN002', name: 'Ligase', pthr: 'PTHR2', proxy_gene: 'HUMAN|Y' }),
]

const stub = (proxySpecies: string[]) =>
  stubAgbApi({
    '/genelist/species/': envelope(GENES),
    '/genelist/proxy_species/': envelope(proxySpecies),
    '/genelist/species-info/': envelope([
      buildSpeciesRow({ long_name: 'Eukaryota', gene_count: '2' }),
    ]),
  })

describe('GeneListPanel', () => {
  it('lists the genes for the species', async () => {
    stub(['Homo sapiens'])
    renderWithProviders(<GeneListPanel species="Eukaryota" />)

    expect(await screen.findByText('PTN001')).toBeInTheDocument()
    expect(screen.getByText('Ligase')).toBeInTheDocument()
  })

  it('labels the columns for an ancestral genome when proxy species exist', async () => {
    stub(['Homo sapiens', 'Mus musculus'])
    renderWithProviders(<GeneListPanel species="Eukaryota" />)

    expect(await screen.findByText('Public ID (ancestral gene)')).toBeInTheDocument()
    expect(screen.getByText('Proxy gene in default species')).toBeInTheDocument()
  })

  it('labels the columns for an extant genome when there are no proxy species', async () => {
    stub([])
    renderWithProviders(<GeneListPanel species="HUMAN" />)

    expect(await screen.findByText('Public ID (extant gene)')).toBeInTheDocument()
    expect(screen.getByText('PANTHER gene ID')).toBeInTheDocument()
    // The proxy picker is meaningless without proxies, so it isn't rendered.
    expect(screen.queryByLabelText('Proxy species')).not.toBeInTheDocument()
  })

  it('reads the selected proxy species from the query string', async () => {
    stub(['Homo sapiens'])
    renderWithProviders(<GeneListPanel species="Eukaryota" />, {
      routes: ['/species/Eukaryota?proxy=Homo sapiens'],
    })

    expect(await screen.findByText('Proxy gene in Homo sapiens')).toBeInTheDocument()
  })

  it('requests the gene list for the proxy species in the query string', async () => {
    const fetchMock = stub(['Homo sapiens'])
    renderWithProviders(<GeneListPanel species="Eukaryota" />, {
      routes: ['/species/Eukaryota?proxy=Homo sapiens'],
    })

    await screen.findByText('PTN001')

    expect(
      requestedUrls(fetchMock).some(url => url.includes('/genelist/species/Eukaryota/Homo sapiens'))
    ).toBe(true)
  })

  it('opens the gene dialog when a row is clicked', async () => {
    stub(['Homo sapiens'])
    const { user, store } = renderWithProviders(<GeneListPanel species="Eukaryota" />)

    await user.click(await screen.findByText('PTN002'))

    await waitFor(() => {
      const dialog = store.getState().dialog
      expect(dialog.component).toBe(DialogComponent.GENE_DETAIL)
      expect(dialog.customProps).toEqual({ ptn: 'PTN002' })
    })
  })

  it('shows the species gene count in the filter placeholder', async () => {
    stub(['Homo sapiens'])
    renderWithProviders(<GeneListPanel species="Eukaryota" />)

    expect(await screen.findByPlaceholderText('Filter 2 genes in Eukaryota')).toBeInTheDocument()
  })
})
