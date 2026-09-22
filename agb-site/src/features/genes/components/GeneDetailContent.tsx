import type React from 'react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { Alert, Anchor, CopyButton, Button, Loader, Text } from '@mantine/core'
import { MdContentCopy, MdDone } from 'react-icons/md'
import InfoCard from '@/@agb.core/components/card/InfoCard'
import { DataTable } from '@/@agb.core/components/table/DataTable'
import { externalUrl } from '@/@agb.core/data/constants'
import type { CsvColumn } from '@/@agb.core/utils/csv'
import { cleanSequence, isAncestral, pantherGeneId } from '../models/gene'
import type { PaintAnnotation, ProxyGene } from '../models/gene'
import { useGetGeneQuery, useGetPaintAnnotationsQuery } from '../slices/genesApiSlice'

const ANNOTATION_COLUMNS: ColumnDef<PaintAnnotation, any>[] = [
  {
    accessorKey: 'go_accession',
    header: 'GO accession',
    size: 160,
    cell: ({ row }) => (
      <Anchor
        href={externalUrl.amigoTerm(row.original.go_accession)}
        target="_blank"
        rel="noreferrer"
        fz="sm"
      >
        {row.original.go_accession}
      </Anchor>
    ),
  },
  {
    accessorKey: 'go_name',
    header: 'GO name',
    cell: ({ row }) => (
      <Anchor
        href={externalUrl.amigoTerm(row.original.go_accession)}
        target="_blank"
        rel="noreferrer"
        fz="sm"
      >
        {row.original.go_name}
      </Anchor>
    ),
  },
]

const ANNOTATION_EXPORT: CsvColumn<PaintAnnotation>[] = [
  { header: 'GO accession', value: 'go_accession' },
  { header: 'GO name', value: 'go_name' },
]

const PROXY_COLUMNS: ColumnDef<ProxyGene, any>[] = [
  { accessorKey: 'proxy_spe_long', header: 'Extant species' },
  {
    accessorKey: 'proxy_gene',
    header: 'PANTHER identifier of proxy gene',
    cell: ({ row }) => (
      <Anchor
        href={externalUrl.pantherGene(row.original.proxy_gene)}
        target="_blank"
        rel="noreferrer"
        fz="sm"
      >
        {row.original.proxy_gene}
      </Anchor>
    ),
  },
]

const PROXY_EXPORT: CsvColumn<ProxyGene>[] = [
  { header: 'Extant species', value: 'proxy_spe_long' },
  { header: 'Proxy gene', value: 'proxy_gene' },
]

interface GeneDetailContentProps {
  ptn: string
}

/**
 * Body of both the gene detail page and the gene preview dialog — the Angular
 * app kept two near-identical copies of this markup and drifted between them.
 */
const GeneDetailContent: React.FC<GeneDetailContentProps> = ({ ptn }) => {
  const { data: gene, isLoading, isError } = useGetGeneQuery(ptn)

  // The GO annotations come from a pantree.org scrape in the API and are much
  // slower than the gene itself, so they load separately and are skipped for
  // extant genes, which never have them.
  const ancestral = gene ? isAncestral(gene) : false
  const {
    data: annotations = [],
    isFetching: annotationsLoading,
    isError: annotationsFailed,
  } = useGetPaintAnnotationsQuery(ptn, { skip: !ancestral })

  const sequence = useMemo(() => cleanSequence(gene?.sequence), [gene?.sequence])
  const pantherId = gene ? pantherGeneId(gene) : undefined

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader color="accent" />
      </div>
    )
  }

  if (isError || !gene) {
    return (
      <Alert color="red" className="m-4">
        Could not load gene {ptn}.
      </Alert>
    )
  }

  return (
    <div className="p-4">
      <InfoCard
        title={ancestral ? 'Inferred ancestral protein name' : 'Extant protein name'}
        hasContent={Boolean(gene.name)}
      >
        {pantherId ? (
          <Anchor
            href={externalUrl.pantherGene(pantherId)}
            target="_blank"
            rel="noreferrer"
            fz="sm"
          >
            {gene.name}
          </Anchor>
        ) : (
          <Text size="sm">{gene.name}</Text>
        )}
      </InfoCard>

      <InfoCard
        title={ancestral ? 'Ancestral species' : 'Extant species'}
        hasContent={Boolean(gene.species_long)}
      >
        <Anchor component={Link} to={`/species/${encodeURIComponent(gene.species_short)}`} fz="sm">
          {gene.species_long}
        </Anchor>
      </InfoCard>

      <InfoCard title="PANTHER family" hasContent={Boolean(gene.pthr)}>
        <Text size="sm">
          <Anchor href={externalUrl.pantherFamily(gene.pthr)} target="_blank" rel="noreferrer">
            {gene.pthr}
          </Anchor>
          {gene.family_name ? ` (${gene.family_name})` : null}
        </Text>
        <Anchor
          component={Link}
          to={`/genes/gene-tree/${encodeURIComponent(gene.pthr)}/${encodeURIComponent(ptn)}`}
          fz="sm"
        >
          View gene within family tree
        </Anchor>
      </InfoCard>

      <InfoCard
        title={
          ancestral ? 'Inferred ancestral protein sequence' : 'Protein sequence of this extant gene'
        }
        hasContent={Boolean(sequence)}
        action={
          sequence ? (
            <CopyButton value={sequence}>
              {({ copied, copy }) => (
                <Button
                  variant="subtle"
                  onClick={copy}
                  leftSection={copied ? <MdDone /> : <MdContentCopy />}
                >
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              )}
            </CopyButton>
          ) : null
        }
      >
        <pre className="max-h-48 overflow-auto rounded bg-gray-50 p-2 font-mono text-xs break-all whitespace-pre-wrap">
          {sequence}
        </pre>
      </InfoCard>

      {ancestral && (
        <InfoCard title="Gene Ontology annotations to this ancestral gene" noPadding hasContent>
          {annotationsLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader color="accent" size="sm" />
            </div>
          ) : annotationsFailed ? (
            <Text c="dimmed" size="sm" className="px-3 py-4">
              GO annotations are unavailable right now. The API reads them from pantree.org, which
              is not responding.
            </Text>
          ) : (
            <div className="max-h-80">
              <DataTable
                data={annotations}
                columns={ANNOTATION_COLUMNS}
                initialPageSize={10}
                filterPlaceholder="Filter annotations"
                emptyMessage="No GO annotations for this gene."
                exportFilename={`${ptn}-go-annotations`}
                exportColumns={ANNOTATION_EXPORT}
                getRowId={(row, index) => `${row.go_accession}-${index}`}
              />
            </div>
          )}
        </InfoCard>
      )}

      {ancestral && (
        <InfoCard title="Proxy genes in extant species" noPadding hasContent>
          <div className="max-h-80">
            <DataTable
              data={gene.proxy_genes}
              columns={PROXY_COLUMNS}
              initialPageSize={10}
              filterPlaceholder="Filter proxy genes"
              emptyMessage="No proxy genes."
              exportFilename={`${ptn}-proxy-genes`}
              exportColumns={PROXY_EXPORT}
              getRowId={(row, index) => `${row.proxy_gene}-${index}`}
            />
          </div>
        </InfoCard>
      )}
    </div>
  )
}

export default GeneDetailContent
