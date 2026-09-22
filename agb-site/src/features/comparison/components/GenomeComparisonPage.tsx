import type React from 'react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Accordion, Anchor, Text } from '@mantine/core'
import { useAppDispatch } from '@/app/hooks'
import { DataTable } from '@/@agb.core/components/table/DataTable'
import { DialogComponent, openDialog } from '@/@agb.core/components/dialog/dialogSlice'
import { countDescendants } from '../models/comparison'
import {
  useGetGainedGenesQuery,
  useGetInheritedGenesQuery,
  useGetLostGenesQuery,
  useGetUnmodeledGenesQuery,
} from '../slices/comparisonApiSlice'
import ComparisonSection from './ComparisonSection'
import {
  gainedColumns,
  gainedExport,
  inheritedColumns,
  inheritedExport,
  lostColumns,
  lostExport,
  unmodeledColumns,
  unmodeledExport,
} from './comparisonColumns'

const INHERITED = 'inherited'
const LOST = 'lost'
const GAINED = 'gained'
const UNMODELED = 'unmodeled'

/**
 * A section's count is unknown until it has been expanded and its query has
 * resolved, and an uncached comparison takes several seconds. Showing "0"
 * would read as a real answer, so render nothing before the request and an
 * ellipsis while it is in flight.
 */
const Count: React.FC<{ value?: number; loading?: boolean; requested?: boolean }> = ({
  value,
  loading = false,
  requested = true,
}) => {
  if (!requested) return null
  if (loading || value === undefined) return <span aria-label="loading">…</span>
  return <strong>{value.toLocaleString('en-US')}</strong>
}

/**
 * Compares an extant genome with one of its ancestral genomes. Each of the four
 * sections loads on first expand — the old page fired all four requests on
 * mount even though three were collapsed.
 */
const GenomeComparisonPage: React.FC = () => {
  const { extant = '', ancestral = '' } = useParams()
  const dispatch = useAppDispatch()

  const [opened, setOpened] = useState<string[]>([INHERITED])
  // RTK Query keeps data cached once loaded, so "has ever been opened" is the
  // right gate rather than "is open now".
  const [loaded, setLoaded] = useState<Set<string>>(new Set([INHERITED]))

  const handleChange = (values: string[]) => {
    setOpened(values)
    setLoaded(previous => new Set([...previous, ...values]))
  }

  const args = { ancestralSpecies: ancestral, extantSpecies: extant }

  const inherited = useGetInheritedGenesQuery(args, { skip: !loaded.has(INHERITED) })
  const lost = useGetLostGenesQuery(args, { skip: !loaded.has(LOST) })
  const gained = useGetGainedGenesQuery(args, { skip: !loaded.has(GAINED) })
  const unmodeled = useGetUnmodeledGenesQuery(extant, { skip: !loaded.has(UNMODELED) })

  const descendantCount = useMemo(
    () => (inherited.data ? countDescendants(inherited.data) : undefined),
    [inherited.data]
  )

  const openGene = (ptn: string) =>
    dispatch(
      openDialog({
        component: DialogComponent.GENE_DETAIL,
        size: 'lg',
        customProps: { ptn },
      })
    )

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-medium">Compare genomes</h1>

      <div className="mb-6 flex flex-wrap gap-x-10 gap-y-2 rounded border border-gray-200 bg-white px-4 py-3">
        <div>
          <Text size="xs" c="dimmed">
            Ancestral species
          </Text>
          <Anchor component={Link} to={`/species/${encodeURIComponent(ancestral)}`} fz="sm">
            {ancestral}
          </Anchor>
        </div>
        <div>
          <Text size="xs" c="dimmed">
            Extant species
          </Text>
          <Anchor component={Link} to={`/species/${encodeURIComponent(extant)}`} fz="sm">
            {extant}
          </Anchor>
        </div>
      </div>

      <Accordion multiple value={opened} onChange={handleChange} variant="separated">
        <ComparisonSection
          value={INHERITED}
          accentColor="#16a34a"
          title={
            <>
              <Count value={descendantCount} loading={inherited.isLoading} /> genes inherited from{' '}
              <Count value={inherited.data?.length} loading={inherited.isLoading} /> ancestral genes
            </>
          }
        >
          <DataTable
            data={inherited.data ?? []}
            columns={inheritedColumns}
            isLoading={inherited.isLoading}
            isError={inherited.isError}
            initialPageSize={10}
            loadingMessage="The first request for a comparison can take several seconds."
            filterPlaceholder={`Filter genes passed from ${ancestral} to ${extant}`}
            emptyMessage="No inherited genes."
            onRowClick={row => openGene(row.ptn)}
            getRowId={(row, index) => `${row.ptn}-${index}`}
            exportFilename={`${ancestral} genes passed to ${extant}`}
            exportColumns={inheritedExport}
          />
        </ComparisonSection>

        <ComparisonSection
          value={LOST}
          accentColor="#dc2626"
          title={
            <>
              Ancestral genes lost{' '}
              <Count
                value={lost.data?.length}
                loading={lost.isLoading}
                requested={loaded.has(LOST)}
              />
            </>
          }
        >
          <DataTable
            data={lost.data ?? []}
            columns={lostColumns}
            isLoading={lost.isLoading}
            isError={lost.isError}
            initialPageSize={10}
            loadingMessage="The first request for a comparison can take several seconds."
            filterPlaceholder={`Filter genes lost prior to ${extant}`}
            emptyMessage="No lost genes."
            onRowClick={row => openGene(row.ptn)}
            getRowId={(row, index) => `${row.ptn}-${index}`}
            exportFilename={`${ancestral} genes lost prior to ${extant}`}
            exportColumns={lostExport}
          />
        </ComparisonSection>

        <ComparisonSection
          value={GAINED}
          accentColor="#2563eb"
          title={
            <>
              Genes gained other than by duplication{' '}
              <Count
                value={gained.data?.length}
                loading={gained.isLoading}
                requested={loaded.has(GAINED)}
              />
            </>
          }
        >
          <DataTable
            data={gained.data ?? []}
            columns={gainedColumns}
            isLoading={gained.isLoading}
            isError={gained.isError}
            initialPageSize={10}
            loadingMessage="The first request for a comparison can take several seconds."
            filterPlaceholder={`Filter genes gained after ${ancestral}`}
            emptyMessage="No gained genes."
            onRowClick={row => openGene(row.ptn)}
            getRowId={(row, index) => `${row.ptn}-${index}`}
            exportFilename={`${extant} genes gained after ${ancestral}`}
            exportColumns={gainedExport}
          />
        </ComparisonSection>

        <ComparisonSection
          value={UNMODELED}
          accentColor="#9ca3af"
          title={
            <>
              Genes with no ancestral reconstruction{' '}
              <Count
                value={unmodeled.data?.length}
                loading={unmodeled.isLoading}
                requested={loaded.has(UNMODELED)}
              />
            </>
          }
        >
          <DataTable
            data={unmodeled.data ?? []}
            columns={unmodeledColumns}
            isLoading={unmodeled.isLoading}
            isError={unmodeled.isError}
            initialPageSize={10}
            loadingMessage="The first request for a comparison can take several seconds."
            filterPlaceholder={`Filter ${extant} genes with no ancestral reconstruction`}
            emptyMessage="No unmodelled genes."
            onRowClick={row => openGene(row.ptn)}
            getRowId={(row, index) => `${row.ptn}-${index}`}
            exportFilename={`${extant} genes not modeled`}
            exportColumns={unmodeledExport}
          />
        </ComparisonSection>
      </Accordion>
    </div>
  )
}

export default GenomeComparisonPage
