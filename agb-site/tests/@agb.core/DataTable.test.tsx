import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/@agb.core/components/table/DataTable'
import { renderWithProviders } from '@tests/test-utils'

interface Row {
  ptn: string
  name: string
}

const rows: Row[] = [
  { ptn: 'PTN3', name: 'Kinase' },
  { ptn: 'PTN1', name: 'Phosphatase' },
  { ptn: 'PTN2', name: 'Ligase' },
]

const columns: ColumnDef<Row, any>[] = [
  { accessorKey: 'ptn', header: 'Public ID' },
  { accessorKey: 'name', header: 'Protein name' },
]

const bodyRows = () => within(screen.getAllByRole('rowgroup')[1]).getAllByRole('row')

describe('DataTable', () => {
  it('renders one row per record', () => {
    renderWithProviders(<DataTable data={rows} columns={columns} />)

    expect(bodyRows()).toHaveLength(3)
  })

  it('filters across every field, not just the first column', async () => {
    const { user } = renderWithProviders(<DataTable data={rows} columns={columns} />)

    await user.type(screen.getByLabelText('Filter rows'), 'Ligase')

    await waitFor(() => expect(bodyRows()).toHaveLength(1))
    expect(screen.getByText('PTN2')).toBeInTheDocument()
  })

  it('sorts by a column when its header is clicked', async () => {
    const { user } = renderWithProviders(<DataTable data={rows} columns={columns} />)

    await user.click(screen.getByRole('button', { name: /public id/i }))

    expect(within(bodyRows()[0]).getByText('PTN1')).toBeInTheDocument()
  })

  it('calls onRowClick with the original record', async () => {
    const onRowClick = vi.fn()
    const { user } = renderWithProviders(
      <DataTable data={rows} columns={columns} onRowClick={onRowClick} />
    )

    await user.click(screen.getByText('Kinase'))

    expect(onRowClick).toHaveBeenCalledWith(rows[0])
  })

  it('pages the rows and reports the total', async () => {
    const { user } = renderWithProviders(
      <DataTable data={rows} columns={columns} initialPageSize={5} />
    )

    // Page size is a Select rendered as a combobox; 5 is the smallest option.
    expect(screen.getByText('3 rows')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Filter rows'), 'PTN1')
    await waitFor(() => expect(screen.getByText('1 of 3 rows')).toBeInTheDocument())
  })

  it('only offers export when given a filename and columns', () => {
    const { unmount } = renderWithProviders(<DataTable data={rows} columns={columns} />)
    expect(screen.queryByRole('button', { name: /export/i })).not.toBeInTheDocument()
    unmount()

    renderWithProviders(
      <DataTable
        data={rows}
        columns={columns}
        exportFilename="genes"
        exportColumns={[{ header: 'Public ID', value: 'ptn' }]}
      />
    )
    expect(screen.getByRole('button', { name: /export/i })).toBeEnabled()
  })

  it('shows the empty message rather than an empty table', () => {
    renderWithProviders(<DataTable data={[]} columns={columns} emptyMessage="No genes here." />)

    expect(screen.getByText('No genes here.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows the error message when the query failed', () => {
    renderWithProviders(
      <DataTable data={[]} columns={columns} isError errorMessage="Could not load." />
    )

    expect(screen.getByText('Could not load.')).toBeInTheDocument()
  })
})
