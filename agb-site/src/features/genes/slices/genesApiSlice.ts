import apiService from '@/app/store/apiService'
import type { AgbEnvelope } from '@/@agb.core/models/api'
import { unwrapFirst, unwrapLists } from '@/@agb.core/models/api'
import { DEFAULT_PROXY_SPECIES } from '@/@agb.core/data/constants'
import type { Gene, GeneListRow, PaintAnnotation } from '../models/gene'

export interface GeneListArgs {
  species: string
  /** Extant species whose genes stand in for the ancestral ones. */
  proxySpecies?: string
}

export const genesApiSlice = apiService.injectEndpoints({
  endpoints: builder => ({
    /**
     * The whole gene list for a species. The API also takes `?page=&limit=`,
     * but every consumer filters, sorts and exports across the full set, so we
     * fetch once and let the table virtualise. RTK Query caches it per
     * species+proxy pair, which is what the Angular double-fetch (page 1, then
     * everything) was working around.
     */
    getGeneList: builder.query<GeneListRow[], GeneListArgs>({
      query: ({ species, proxySpecies = DEFAULT_PROXY_SPECIES }) =>
        `/genelist/species/${encodeURIComponent(species)}/${encodeURIComponent(proxySpecies)}`,
      transformResponse: (response: AgbEnvelope<GeneListRow>) => unwrapLists(response),
      providesTags: (_result, _error, { species }) => [{ type: 'Gene', id: `list:${species}` }],
    }),

    /** Extant species that have a proxy gene for this ancestral genome. */
    getProxySpecies: builder.query<string[], string>({
      query: species => `/genelist/proxy_species/${encodeURIComponent(species)}`,
      transformResponse: (response: AgbEnvelope<string>) =>
        [...unwrapLists(response)].sort((a, b) => a.localeCompare(b)),
      providesTags: (_result, _error, species) => [{ type: 'Gene', id: `proxy:${species}` }],
    }),

    getGene: builder.query<Gene | undefined, string>({
      query: ptn => `/genelist/gene/${encodeURIComponent(ptn)}`,
      transformResponse: (response: AgbEnvelope<Gene>) => unwrapFirst(response),
      providesTags: (_result, _error, ptn) => [{ type: 'Gene', id: ptn }],
    }),

    /**
     * GO annotations for an ancestral gene. The API scrapes pantree.org, so
     * this is the slow one — kept in its own endpoint so the gene detail view
     * renders before it resolves.
     */
    getPaintAnnotations: builder.query<PaintAnnotation[], string>({
      query: ptn => `/genelist/gene_go/${encodeURIComponent(ptn)}`,
      transformResponse: (response: AgbEnvelope<{ paint_annotations: PaintAnnotation[] }>) =>
        unwrapFirst(response)?.paint_annotations ?? [],
      providesTags: (_result, _error, ptn) => [{ type: 'Gene', id: `paint:${ptn}` }],
    }),
  }),
})

export const {
  useGetGeneListQuery,
  useGetProxySpeciesQuery,
  useGetGeneQuery,
  useGetPaintAnnotationsQuery,
} = genesApiSlice
