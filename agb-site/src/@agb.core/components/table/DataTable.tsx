import type React from 'react'
import { useEffect, useMemo, useState } from 'react'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Button, Group, Loader, Pagination, Select, Table, Text, TextInput } from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { MdArrowDownward, MdArrowUpward, MdFileDownload, MdUnfoldMore } from 'react-icons/md'
import type { CsvColumn } from '@/@agb.core/utils/csv'
import { downloadCsv } from '@/@agb.core/utils/csv'
import { matchesAnyField } from '@/@agb.core/utils/text'

const PAGE_SIZE_OPTIONS = ['5', '10', '25', '50', '100']

export interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T, any>[]
  isLoading?: boolean
  /**
   * Shown beside the spinner. Worth setting where a first load is slow — an
   * uncached gene list takes ~9s from the API.
   */
  loadingMessage?: string
  isError?: boolean
  emptyMessage?: string
  errorMessage?: string
  onRowClick?: (row: T) => void
  /** Placeholder for the filter box; the old site put the row count here. */
  filterPlaceholder?: string
  /** Rendered at the start of the toolbar, before the filter. */
  toolbarStart?: React.ReactNode
  /** Rendered at the end of the toolbar, after the export button. */
  toolbarEnd?: React.ReactNode
  /** Enables the export button. Filename may omit the `.csv` suffix. */
  exportFilename?: string
  exportColumns?: CsvColumn<T>[]
  initialPageSize?: number
  /** Stable row identity; falls back to the row index. */
  getRowId?: (row: T, index: number) => string
}

/**
 * The single table used by every list in the app. The Angular version repeated
 * a `DataSource` subclass — filter + sort + paginate + export, ~110 lines —
 * once per table, five times, each with its own copy of the same sort bug.
 *
 * Filtering, sorting and paging are all client-side because the export and the
 * row counts operate over the full result set; the API's `?page=` is therefore
 * unused. See the migration plan for when that should change.
 */
export function DataTable<T>({
  data,
  columns,
  isLoading = false,
  loadingMessage,
  isError = false,
  emptyMessage = 'No rows to show.',
  errorMessage = 'Could not load this list.',
  onRowClick,
  filterPlaceholder = 'Filter',
  toolbarStart,
  toolbarEnd,
  exportFilename,
  exportColumns,
  initialPageSize = 50,
  getRowId,
}: DataTableProps<T>) {
  const [filter, setFilter] = useState('')
  const [debouncedFilter] = useDebouncedValue(filter, 150)
  const [sorting, setSorting] = useState<SortingState>([])
  const [pageSize, setPageSize] = useState(initialPageSize)

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter: debouncedFilter, sorting },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFilter,
    globalFilterFn: (row, _columnId, value) => matchesAnyField(row.original, value),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId,
    initialState: { pagination: { pageSize: initialPageSize, pageIndex: 0 } },
  })

  // A narrowed filter can leave the viewer on a page that no longer exists.
  useEffect(() => {
    table.setPageIndex(0)
  }, [debouncedFilter, table])

  const filteredRows = table.getFilteredRowModel().rows
  const pageCount = table.getPageCount()

  const exportRows = useMemo(() => filteredRows.map(row => row.original), [filteredRows])

  const canExport = Boolean(exportFilename && exportColumns?.length)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Group
        gap="xs"
        wrap="nowrap"
        className="border-agb-border bg-agb-toolbar min-h-10 shrink-0 border-b px-[5px] py-1"
      >
        {toolbarStart}
        <TextInput
          className="min-w-[220px] grow"
          value={filter}
          onChange={event => setFilter(event.currentTarget.value)}
          placeholder={filterPlaceholder}
          aria-label="Filter rows"
          autoComplete="off"
        />
        {canExport && (
          <Button
            variant="subtle"
            leftSection={<MdFileDownload />}
            onClick={() => downloadCsv(exportRows, exportColumns!, exportFilename!)}
            disabled={exportRows.length === 0}
          >
            Export
          </Button>
        )}
        {toolbarEnd}
      </Group>

      <div className="min-h-0 grow overflow-auto">
        {isLoading ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 py-10">
            <Loader color="accent" />
            {loadingMessage && (
              <Text c="dimmed" size="sm" className="max-w-md text-center">
                {loadingMessage}
              </Text>
            )}
          </div>
        ) : isError ? (
          <Text c="red" size="sm" className="px-3 py-6">
            {errorMessage}
          </Text>
        ) : filteredRows.length === 0 ? (
          <Text c="dimmed" size="sm" className="px-3 py-6">
            {emptyMessage}
          </Text>
        ) : (
          <Table highlightOnHover striped stickyHeader verticalSpacing={4} fz="sm">
            <Table.Thead>
              {table.getHeaderGroups().map(headerGroup => (
                <Table.Tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => {
                    const sortable = header.column.getCanSort()
                    const sorted = header.column.getIsSorted()

                    return (
                      <Table.Th
                        key={header.id}
                        style={{ width: header.column.columnDef.size }}
                        className="border-agb-border h-10 border-b bg-white text-xs font-medium whitespace-nowrap text-black/54"
                      >
                        {header.isPlaceholder ? null : sortable ? (
                          <button
                            type="button"
                            className="flex items-center gap-1 text-left font-medium"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {sorted === 'asc' ? (
                              <MdArrowUpward aria-label="sorted ascending" />
                            ) : sorted === 'desc' ? (
                              <MdArrowDownward aria-label="sorted descending" />
                            ) : (
                              <MdUnfoldMore className="text-gray-400" aria-hidden />
                            )}
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </Table.Th>
                    )
                  })}
                </Table.Tr>
              ))}
            </Table.Thead>
            <Table.Tbody>
              {table.getRowModel().rows.map(row => (
                <Table.Tr
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={onRowClick ? 'cursor-pointer' : undefined}
                >
                  {row.getVisibleCells().map(cell => (
                    <Table.Td key={cell.id} className="align-top">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </div>

      {!isLoading && !isError && filteredRows.length > 0 && (
        <Group
          justify="space-between"
          gap="xs"
          wrap="nowrap"
          className="border-agb-border shrink-0 border-t bg-white px-[5px] py-1"
        >
          <Text size="xs" c="dimmed">
            {filteredRows.length.toLocaleString('en-US')}
            {filteredRows.length !== data.length &&
              ` of ${data.length.toLocaleString('en-US')}`}{' '}
            rows
          </Text>
          <Group gap="xs" wrap="nowrap">
            <Select
              data={PAGE_SIZE_OPTIONS}
              value={String(pageSize)}
              onChange={value => {
                const next = Number(value)
                setPageSize(next)
                table.setPageSize(next)
              }}
              aria-label="Rows per page"
              w={80}
            />
            <Pagination
              size="sm"
              total={pageCount}
              value={table.getState().pagination.pageIndex + 1}
              onChange={page => table.setPageIndex(page - 1)}
              withEdges
            />
          </Group>
        </Group>
      )}
    </div>
  )
}

export default DataTable
