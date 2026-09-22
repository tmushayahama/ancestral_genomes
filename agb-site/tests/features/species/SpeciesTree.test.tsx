import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import SpeciesTree from '@/features/species/components/SpeciesTree'
import { DialogComponent } from '@/@agb.core/components/dialog/dialogSlice'
import { renderWithProviders } from '@tests/test-utils'
import { buildSpeciesRow } from '@tests/fixtures/builders'
import { envelope, stubAgbApi } from '@tests/fixtures/apiStub'

const SPECIES_ROWS = [
  buildSpeciesRow({
    id: '1',
    short_name: 'LUCA',
    long_name: 'LUCA',
    parent_id: '',
    timescale: '4200',
  }),
  buildSpeciesRow({
    id: '2',
    short_name: 'Eukaryota',
    long_name: 'Eukaryota',
    parent_id: '1',
    timescale: '1800',
    gene_count: '500',
  }),
  buildSpeciesRow({
    id: '3',
    short_name: 'HUMAN',
    long_name: 'Homo sapiens',
    parent_id: '2',
    timescale: '0',
    gene_count: '20000',
  }),
]

const renderTree = (activeSpecies: string | null = null) => {
  stubAgbApi({ '/genelist/species-list': envelope(SPECIES_ROWS) })
  return renderWithProviders(<SpeciesTree activeSpecies={activeSpecies} />)
}

describe('SpeciesTree', () => {
  it('renders the hierarchy fully expanded', async () => {
    renderTree()

    expect(await screen.findByText('LUCA')).toBeInTheDocument()
    expect(screen.getByText('Eukaryota')).toBeInTheDocument()
    expect(screen.getByText('Homo sapiens')).toBeInTheDocument()
  })

  it('collapses a subtree when its caret is clicked, and restores it', async () => {
    const { user } = renderTree()

    await screen.findByText('Eukaryota')
    await user.click(screen.getByRole('button', { name: 'Collapse Eukaryota' }))

    expect(screen.queryByText('Homo sapiens')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Expand Eukaryota' }))
    expect(screen.getByText('Homo sapiens')).toBeInTheDocument()
  })

  it('marks the active species as selected', async () => {
    renderTree('Eukaryota')

    const row = (await screen.findByText('Eukaryota')).closest('[role="treeitem"]')

    expect(row).toHaveAttribute('aria-selected', 'true')
  })

  it('opens the species dialog from the row info button', async () => {
    const { user, store } = renderTree()

    await screen.findByText('Homo sapiens')
    await user.click(screen.getByRole('button', { name: 'Information about Homo sapiens' }))

    await waitFor(() => {
      const dialog = store.getState().dialog
      expect(dialog.open).toBe(true)
      expect(dialog.component).toBe(DialogComponent.SPECIES_DETAIL)
      expect(dialog.customProps).toEqual({ species: 'HUMAN' })
    })
  })

  it('reports a failed tree load instead of rendering an empty tree', async () => {
    stubAgbApi({ '/genelist/species-list': envelope([]) }, { failing: ['/genelist/species-list'] })
    renderWithProviders(<SpeciesTree activeSpecies={null} />)

    expect(await screen.findByText('Could not load the species tree.')).toBeInTheDocument()
  })
})
