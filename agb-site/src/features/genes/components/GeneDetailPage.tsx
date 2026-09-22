import type React from 'react'
import { useParams } from 'react-router-dom'
import { Text } from '@mantine/core'
import { useGetGeneQuery } from '../slices/genesApiSlice'
import { isAncestral } from '../models/gene'
import GeneDetailContent from './GeneDetailContent'

/** Standalone, shareable form of the gene preview dialog. */
const GeneDetailPage: React.FC = () => {
  const { ptn = '' } = useParams()
  const { data: gene } = useGetGeneQuery(ptn)

  const kind = gene ? (isAncestral(gene) ? 'ancestral gene' : 'extant gene') : ''

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="border-b border-gray-200 bg-white px-4 py-3">
        <Text fw={500}>
          {ptn}
          {kind && <Text span c="dimmed" fz="sm">{` (${kind})`}</Text>}
        </Text>
      </div>
      <GeneDetailContent ptn={ptn} />
    </div>
  )
}

export default GeneDetailPage
