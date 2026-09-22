import type React from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { DEFAULT_PROXY_SPECIES, ROOT_SPECIES } from '@/@agb.core/data/constants'

const browseUrl = (species: string, proxySpecies: string) =>
  `/species/${encodeURIComponent(species)}?proxy=${encodeURIComponent(proxySpecies)}`

/**
 * The Angular site addressed the gene list through a named router outlet:
 * `/species/genes/(list:genes/LUCA/default species)`. That syntax is
 * Angular-only — and it puts a space in a path segment — so it is translated
 * here rather than reproduced. Those URLs are in published links and
 * bookmarks, so the redirect has to stay.
 */
export const LegacyOutletRedirect: React.FC = () => {
  const params = useParams()
  const rest = params['*'] ?? ''

  const match = /^\(list:genes\/(.+?)\/(.+?)\)$/.exec(decodeURIComponent(rest))
  const species = match?.[1] ?? ROOT_SPECIES
  const proxySpecies = match?.[2] ?? DEFAULT_PROXY_SPECIES

  return <Navigate to={browseUrl(species, proxySpecies)} replace />
}

/** Old standalone gene list: `/genes/:species/:proxySpecies`. */
export const LegacyGeneListRedirect: React.FC = () => {
  const { species = ROOT_SPECIES, proxySpecies = DEFAULT_PROXY_SPECIES } = useParams()

  return <Navigate to={browseUrl(species, proxySpecies)} replace />
}
