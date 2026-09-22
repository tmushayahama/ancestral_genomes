import type React from 'react'
import { Link } from 'react-router-dom'
import { Alert, Anchor, Loader, Text } from '@mantine/core'
import InfoCard from '@/@agb.core/components/card/InfoCard'
import { externalUrl } from '@/@agb.core/data/constants'
import { isExtant } from '../models/species'
import { useGetSpeciesDetailQuery } from '../slices/speciesApiSlice'

interface SpeciesDetailContentProps {
  species: string
}

/**
 * Body of both the species detail page and the species preview dialog.
 *
 * Species long names are hyphen-joined clade names ("Homo-Pan-Gorilla"), which
 * the old templates split to build one external link per clade. That stays.
 */
const SpeciesDetailContent: React.FC<SpeciesDetailContentProps> = ({ species }) => {
  const { data: detail, isLoading, isError } = useGetSpeciesDetailQuery(species)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader color="accent" />
      </div>
    )
  }

  if (isError || !detail) {
    return (
      <Alert color="red" className="m-4">
        Could not load species {species}.
      </Alert>
    )
  }

  const cladeNames = (detail.long_name ?? '').split('-').filter(Boolean)
  const extant = isExtant(detail)

  return (
    <div className="p-4">
      <InfoCard title="Species name" hasContent={Boolean(detail.long_name)}>
        <Text size="sm">{detail.long_name}</Text>
      </InfoCard>

      {!extant && (
        <InfoCard title="Estimated speciation time" hasContent={Boolean(detail.timescale)}>
          <Text size="sm">{detail.timescale} million years ago</Text>
        </InfoCard>
      )}

      <InfoCard
        title="Total number of protein-coding genes"
        hasContent={Boolean(detail.gene_count)}
      >
        <Anchor component={Link} to={`/species/${encodeURIComponent(detail.short_name)}`} fz="sm">
          {detail.gene_count?.toLocaleString('en-US')}
        </Anchor>
      </InfoCard>

      {extant && (
        <InfoCard
          title={`Ancestral genomes of ${detail.long_name}`}
          hasContent={Boolean(detail.all_ancestors?.length)}
          emptyMessage="No ancestral genomes recorded."
        >
          <ul className="flex flex-col gap-1">
            {detail.all_ancestors?.map(([mya, ancestor]) => (
              <li key={ancestor} className="flex flex-wrap items-baseline gap-2 text-sm">
                <Anchor component={Link} to={`/species/${encodeURIComponent(ancestor)}`} fz="sm">
                  {ancestor}
                </Anchor>
                <Text span c="dimmed" fz="xs">
                  ({mya} mya)
                </Text>
                <Anchor
                  component={Link}
                  to={`/genes/genome-comparison/${encodeURIComponent(
                    detail.long_name
                  )}/${encodeURIComponent(ancestor)}`}
                  fz="sm"
                >
                  compare with {detail.long_name}
                </Anchor>
              </li>
            ))}
          </ul>
        </InfoCard>
      )}

      <InfoCard title="NCBI taxonomy" hasContent={Boolean(detail.taxon_id)}>
        <Anchor
          href={externalUrl.ncbiTaxonomy(detail.taxon_id)}
          target="_blank"
          rel="noreferrer"
          fz="sm"
        >
          {detail.taxon_id}
        </Anchor>
      </InfoCard>

      <InfoCard title="Tree of Life Web Project" hasContent={cladeNames.length > 0}>
        <div className="flex flex-wrap gap-3">
          {cladeNames.map(name => (
            <Anchor
              key={name}
              href={externalUrl.treeOfLife(name)}
              target="_blank"
              rel="noreferrer"
              fz="sm"
            >
              {name}
            </Anchor>
          ))}
        </div>
      </InfoCard>

      <InfoCard title="Wikipedia" hasContent={cladeNames.length > 0}>
        <div className="flex flex-wrap gap-3">
          {cladeNames.map(name => (
            <Anchor
              key={name}
              href={externalUrl.wikipedia(name)}
              target="_blank"
              rel="noreferrer"
              fz="sm"
            >
              {name}
            </Anchor>
          ))}
        </div>
      </InfoCard>
    </div>
  )
}

export default SpeciesDetailContent
