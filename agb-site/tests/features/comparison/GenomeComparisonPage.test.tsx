import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import GenomeComparisonPage from '@/features/comparison/components/GenomeComparisonPage'
import { renderWithProviders } from '@tests/test-utils'
import { envelope, requestedUrls, stubAgbApi } from '@tests/fixtures/apiStub'

const INHERITED = [
  {
    ptn: 'PTN001',
    name: 'Kinase',
    descent_ptns: 'PTN100,PTN101',
    descent_gnames: 'kinase A,kinase B',
    descent_longIds: 'HUMAN|A,HUMAN|B',
  },
  {
    ptn: 'PTN002',
    // The API stores unnamed proteins as a bare "1".
    name: '1',
    descent_ptns: 'PTN102',
    descent_gnames: 'ligase',
    descent_longIds: 'HUMAN|C',
  },
]

const LOST = [{ ptn: 'PTN003', name: 'Lost protein' }]
const GAINED = [{ ptn: 'PTN004', name: 'Gained protein', proxy_gene: 'HUMAN|D' }]
const UNMODELED = [{ ptn: 'PTN005', name: 'Unmodelled protein', proxy_gene: 'HUMAN|E' }]

const stub = () =>
  stubAgbApi({
    '/genelist/gene-pass/': envelope(INHERITED),
    '/genelist/gene-loss/': envelope(LOST),
    '/genelist/gene-gain/': envelope(GAINED),
    '/genelist/gene-no-model/': envelope(UNMODELED),
  })

const renderPage = () =>
  renderWithProviders(
    <Routes>
      <Route
        path="/genes/genome-comparison/:extant/:ancestral"
        element={<GenomeComparisonPage />}
      />
    </Routes>,
    { routes: ['/genes/genome-comparison/Homo-Pan/Eukaryota'] }
  )

describe('GenomeComparisonPage', () => {
  it('counts descendant genes and ancestral genes separately in the header', async () => {
    stub()
    renderPage()

    // Three descendants across two inherited ancestral genes.
    expect(await screen.findByText('3')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('splits the comma-joined descendant ids into one row each', async () => {
    stub()
    renderPage()

    expect(await screen.findByText('HUMAN|A')).toBeInTheDocument()
    expect(screen.getByText('HUMAN|B')).toBeInTheDocument()
  })

  it('renders NOT_NAMED for proteins the API names "1"', async () => {
    stub()
    renderPage()

    expect(await screen.findByText('NOT_NAMED')).toBeInTheDocument()
  })

  it('only requests the inherited section until another is expanded', async () => {
    const fetchMock = stub()
    const { user } = renderPage()

    await screen.findByText('HUMAN|A')

    const before = requestedUrls(fetchMock)
    expect(before.some(url => url.includes('gene-pass'))).toBe(true)
    expect(before.some(url => url.includes('gene-loss'))).toBe(false)

    await user.click(screen.getByText(/Ancestral genes lost/))

    await waitFor(() =>
      expect(requestedUrls(fetchMock).some(url => url.includes('gene-loss'))).toBe(true)
    )
    expect(await screen.findByText('Lost protein')).toBeInTheDocument()
  })

  it('keys the unmodelled section off the extant species alone', async () => {
    const fetchMock = stub()
    const { user } = renderPage()

    await screen.findByText('HUMAN|A')
    await user.click(screen.getByText(/no ancestral reconstruction/))

    await waitFor(() =>
      expect(
        requestedUrls(fetchMock).some(url => url.includes('/genelist/gene-no-model/Homo-Pan'))
      ).toBe(true)
    )
  })

  it('links both species back to their browse views', async () => {
    stub()
    renderPage()

    expect(await screen.findByRole('link', { name: 'Eukaryota' })).toHaveAttribute(
      'href',
      '/species/Eukaryota'
    )
    expect(screen.getByRole('link', { name: 'Homo-Pan' })).toHaveAttribute(
      'href',
      '/species/Homo-Pan'
    )
  })
})
