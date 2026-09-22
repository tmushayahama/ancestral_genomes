import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import SpeciesDetailContent from '@/features/species/components/SpeciesDetailContent'
import { renderWithProviders } from '@tests/test-utils'
import { buildSpeciesRow } from '@tests/fixtures/builders'
import { envelope, stubAgbApi } from '@tests/fixtures/apiStub'

const EXTANT = buildSpeciesRow({
  short_name: 'HUMAN',
  long_name: 'Homo-Pan',
  taxon_id: '9606',
  timescale: '0',
  gene_count: '20000',
  all_ancestors: [
    ['1105', 'Eukaryota'],
    ['4290', 'LUCA'],
  ],
})

const ANCESTRAL = buildSpeciesRow({
  short_name: 'Eukaryota',
  long_name: 'Eukaryota',
  taxon_id: '2759',
  timescale: '1800',
  gene_count: '5000',
})

const render = (detail: ReturnType<typeof buildSpeciesRow>, species: string) => {
  stubAgbApi({ '/genelist/species-info/': envelope([detail]) })
  return renderWithProviders(<SpeciesDetailContent species={species} />)
}

describe('SpeciesDetailContent', () => {
  it('shows the speciation time for an ancestral species', async () => {
    render(ANCESTRAL, 'Eukaryota')

    expect(await screen.findByText('Estimated speciation time')).toBeInTheDocument()
    expect(screen.getByText('1800 million years ago')).toBeInTheDocument()
  })

  it('hides the speciation time for an extant species, whose timescale is zero', async () => {
    render(EXTANT, 'HUMAN')

    await screen.findByText('Species name')
    expect(screen.queryByText('Estimated speciation time')).not.toBeInTheDocument()
  })

  it('lists ancestral genomes with comparison links only for extant species', async () => {
    render(EXTANT, 'HUMAN')

    expect(await screen.findByText('Ancestral genomes of Homo-Pan')).toBeInTheDocument()

    // One row per ancestor; the route is
    // /genes/genome-comparison/:extant/:ancestral, so the extant species
    // comes first even though the ancestor is what varies per row.
    const compareLinks = screen.getAllByRole('link', { name: 'compare with Homo-Pan' })
    expect(compareLinks.map(link => link.getAttribute('href'))).toEqual([
      '/genes/genome-comparison/Homo-Pan/Eukaryota',
      '/genes/genome-comparison/Homo-Pan/LUCA',
    ])
    expect(screen.getByText('(1105 mya)')).toBeInTheDocument()
  })

  it('omits the ancestral genomes card for an ancestral species', async () => {
    render(ANCESTRAL, 'Eukaryota')

    await screen.findByText('Species name')
    expect(screen.queryByText(/Ancestral genomes of/)).not.toBeInTheDocument()
  })

  it('builds one Tree of Life and Wikipedia link per clade in the hyphenated name', async () => {
    render(EXTANT, 'HUMAN')

    await screen.findByText('Tree of Life Web Project')

    // "Homo-Pan" is two clades, and each gets a link on both cards.
    const hrefFor = (name: string) =>
      screen.getAllByRole('link', { name }).map(link => link.getAttribute('href'))

    expect(hrefFor('Homo')).toEqual([
      'http://tolweb.org/Homo',
      'https://en.wikipedia.org/wiki/Homo',
    ])
    expect(hrefFor('Pan')).toEqual(['http://tolweb.org/Pan', 'https://en.wikipedia.org/wiki/Pan'])
  })

  it('links the taxon id to NCBI', async () => {
    render(ANCESTRAL, 'Eukaryota')

    expect(await screen.findByRole('link', { name: '2759' })).toHaveAttribute(
      'href',
      expect.stringContaining('wwwtax.cgi?mode=Info&id=2759')
    )
  })

  it('reports a failed load', async () => {
    stubAgbApi(
      { '/genelist/species-info/': envelope([]) },
      { failing: ['/genelist/species-info/'] }
    )
    renderWithProviders(<SpeciesDetailContent species="LUCA" />)

    expect(await screen.findByText('Could not load species LUCA.')).toBeInTheDocument()
  })
})
