import type React from 'react'
import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { ActionIcon, Anchor, Select, Text, Tooltip } from '@mantine/core'
import { MdHelpOutline } from 'react-icons/md'
import { useAppDispatch } from '@/app/hooks'
import { DataTable } from '@/@agb.core/components/table/DataTable'
import { DialogComponent, openDialog } from '@/@agb.core/components/dialog/dialogSlice'
import { DEFAULT_PROXY_SPECIES } from '@/@agb.core/data/constants'
import type { CsvColumn } from '@/@agb.core/utils/csv'
import { useGetSpeciesDetailQuery } from '@/features/species/slices/speciesApiSlice'
import { useGetGeneListQuery, useGetProxySpeciesQuery } from '../slices/genesApiSlice'
import type { GeneListRow } from '../models/gene'

const PROXY_HELP =
  'Proxy genes are genes in an extant genome that stand in for an ancestral gene. The proxy is the closest descendant (smallest total branch length in the gene tree) of the ancestral gene in the selected extant species. Because an ancestral gene is extinct it has never been studied directly, and the proxy may share characteristics — such as function — inherited from it. Select an extant species to show its proxy genes; click a row for the full list of proxies for one ancestral gene.'

const EXPORT_COLUMNS: CsvColumn<GeneListRow>[] = [
  { header: 'Public ID', value: 'ptn' },
  { header: 'Protein name', value: 'name' },
  { header: 'PANTHER family', value: 'pthr' },
  { header: 'Proxy gene', value: 'proxy_gene' },
]

interface GeneListPanelProps {
  species: string
}

/**
 * Gene list for one species. The proxy species lives in `?proxy=` rather than
 * in the path, so changing it is a search-param update on the same route
 * instead of the Angular app's full navigation to a new named-outlet URL.
 */
const GeneListPanel: React.FC<GeneListPanelProps> = ({ species }) => {
  const dispatch = useAppDispatch()
  const [searchParams, setSearchParams] = useSearchParams()
  const proxySpecies = searchParams.get('proxy') || DEFAULT_PROXY_SPECIES

  const { data: genes = [], isLoading, isError } = useGetGeneListQuery({ species, proxySpecies })
  const { data: proxySpeciesList = [] } = useGetProxySpeciesQuery(species)
  const { data: speciesDetail } = useGetSpeciesDetailQuery(species)

  // A species with proxies is ancestral; one without is an extant genome, and
  // its "proxy gene" column is really just the PANTHER gene id.
  const isAncestralGenome = proxySpeciesList.length > 0

  const columns = useMemo<ColumnDef<GeneListRow, any>[]>(
    () => [
      {
        accessorKey: 'ptn',
        size: 170,
        header: isAncestralGenome ? 'Public ID (ancestral gene)' : 'Public ID (extant gene)',
      },
      { accessorKey: 'name', header: 'Protein name' },
      { accessorKey: 'pthr', size: 160, header: 'PANTHER family' },
      {
        accessorKey: 'proxy_gene',
        header: isAncestralGenome
          ? proxySpecies === DEFAULT_PROXY_SPECIES
            ? 'Proxy gene in default species'
            : `Proxy gene in ${proxySpecies}`
          : 'PANTHER gene ID',
      },
    ],
    [isAncestralGenome, proxySpecies]
  )

  const openGene = (row: GeneListRow) =>
    dispatch(
      openDialog({
        component: DialogComponent.GENE_DETAIL,
        size: 'lg',
        customProps: { ptn: row.ptn },
      })
    )

  const openSpeciesInfo = () =>
    dispatch(
      openDialog({
        component: DialogComponent.SPECIES_DETAIL,
        size: 'lg',
        customProps: { species },
      })
    )

  const proxyOptions = useMemo(
    () => [DEFAULT_PROXY_SPECIES, ...proxySpeciesList],
    [proxySpeciesList]
  )

  return (
    <DataTable
      data={genes}
      columns={columns}
      isLoading={isLoading}
      loadingMessage={`Loading genes for ${species}. The first request for a species can take several seconds; afterwards the API serves it from cache.`}
      isError={isError}
      emptyMessage={`No genes found for ${speciesDetail?.long_name ?? species}.`}
      onRowClick={openGene}
      getRowId={(row, index) => row.ptn || String(index)}
      filterPlaceholder={
        speciesDetail
          ? `Filter ${speciesDetail.gene_count?.toLocaleString('en-US')} genes in ${speciesDetail.long_name}`
          : 'Filter genes'
      }
      exportFilename={species}
      exportColumns={EXPORT_COLUMNS}
      toolbarStart={
        <Text size="sm" className="shrink-0 whitespace-nowrap">
          Selected species:{' '}
          <Anchor component="button" type="button" onClick={openSpeciesInfo} fz="sm">
            {speciesDetail?.long_name ?? species}
          </Anchor>
        </Text>
      }
      toolbarEnd={
        isAncestralGenome ? (
          <>
            <Tooltip label={PROXY_HELP} w={420}>
              <ActionIcon size="sm" aria-label="About proxy genes">
                <MdHelpOutline />
              </ActionIcon>
            </Tooltip>
            <Select
              className="shrink-0"
              w={230}
              data={proxyOptions}
              value={proxySpecies}
              onChange={value =>
                setSearchParams(value && value !== DEFAULT_PROXY_SPECIES ? { proxy: value } : {})
              }
              aria-label="Proxy species"
            />
          </>
        ) : null
      }
    />
  )
}

export default GeneListPanel
