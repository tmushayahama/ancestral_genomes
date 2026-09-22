import apiService from '@/app/store/apiService'
import type { AgbEnvelope } from '@/@agb.core/models/api'
import { unwrapFirst, unwrapLists } from '@/@agb.core/models/api'
import { timescaleBucket } from '@/@agb.core/data/timescale'
import type { SpeciesDetail, SpeciesNode, SpeciesRowWire } from '../models/species'
import { toSpeciesDetail } from '../models/species'

/**
 * Nests the flat species list. Ported from `SpeciesService._buildSpeciesTree`,
 * but O(n) via a parent index instead of the original O(n²) scan, and it fills
 * `level` correctly (the Angular version's `level++` never propagated).
 *
 * The root is the row whose `parent_id` is the empty string — not null, not
 * absent. If the API ever changes that, this silently returns an empty tree.
 */
export const buildSpeciesTree = (rows: SpeciesRowWire[]): SpeciesNode[] => {
  const byParent = new Map<string, SpeciesRowWire[]>()

  for (const row of rows) {
    const key = String(row.parent_id ?? '')
    const siblings = byParent.get(key)
    if (siblings) siblings.push(row)
    else byParent.set(key, [row])
  }

  const build = (parentId: string, level: number): SpeciesNode[] =>
    (byParent.get(parentId) ?? []).map(row => ({
      id: String(row.id),
      taxon_id: row.taxon_id,
      short_name: row.short_name,
      long_name: row.long_name,
      parent_id: String(row.parent_id ?? ''),
      timescale: Number(row.timescale),
      gene_count: Number(row.gene_count),
      level,
      timescaleBucket: timescaleBucket(row.timescale),
      children: build(String(row.id), level + 1),
    }))

  return build('', 0)
}

export const speciesApiSlice = apiService.injectEndpoints({
  endpoints: builder => ({
    getSpeciesTree: builder.query<SpeciesNode[], void>({
      query: () => '/genelist/species-list/',
      transformResponse: (response: AgbEnvelope<SpeciesRowWire>) =>
        buildSpeciesTree(unwrapLists(response)),
      providesTags: ['Species'],
    }),

    getSpeciesDetail: builder.query<SpeciesDetail | undefined, string>({
      query: species => `/genelist/species-info/${encodeURIComponent(species)}`,
      transformResponse: (response: AgbEnvelope<SpeciesRowWire>) => {
        const row = unwrapFirst(response)
        return row ? toSpeciesDetail(row) : undefined
      },
      providesTags: (_result, _error, species) => [{ type: 'Species', id: species }],
    }),
  }),
})

export const { useGetSpeciesTreeQuery, useGetSpeciesDetailQuery } = speciesApiSlice
