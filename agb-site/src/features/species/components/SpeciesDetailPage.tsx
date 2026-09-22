import type React from 'react'
import { useParams } from 'react-router-dom'
import { Text } from '@mantine/core'
import SpeciesDetailContent from './SpeciesDetailContent'

/** Standalone, shareable form of the species preview dialog. */
const SpeciesDetailPage: React.FC = () => {
  const { species = '' } = useParams()

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="border-b border-gray-200 bg-white px-4 py-3">
        <Text fw={500}>{species}</Text>
      </div>
      <SpeciesDetailContent species={species} />
    </div>
  )
}

export default SpeciesDetailPage
