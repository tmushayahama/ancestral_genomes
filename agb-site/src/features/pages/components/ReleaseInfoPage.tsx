import type React from 'react'
import { RELEASE_INFO } from '../data/releaseInfo'
import PageContainer from './PageContainer'

const format = (value: number) => value.toLocaleString('en-US')

const ReleaseInfoPage: React.FC = () => (
  <PageContainer title="Ancestral Genomes website release information">
    <ul>
      <li>PANTHER library version: {RELEASE_INFO.pantherVersion}</li>
      <li>Number of ancestral species: {format(RELEASE_INFO.ancestralSpecies)}</li>
      <li>Number of extant species: {format(RELEASE_INFO.extantSpecies)}</li>
      <li>Number of ancestral genes: {format(RELEASE_INFO.ancestralGenes)}</li>
      <li>Number of extant genes: {format(RELEASE_INFO.extantGenes)}</li>
    </ul>
  </PageContainer>
)

export default ReleaseInfoPage
