import apiService from '@/app/store/apiService'
import type { AgbEnvelope } from '@/@agb.core/models/api'
import { splitList, unwrapLists } from '@/@agb.core/models/api'
import type { GainedGene, InheritedGene, LostGene, UnmodeledGene } from '../models/comparison'

export interface ComparisonArgs {
  ancestralSpecies: string
  extantSpecies: string
}

interface InheritedRow {
  ptn: string
  name: string
  descent_ptns: string
  descent_gnames: string
  descent_longIds: string
}

const path = (segment: string, { ancestralSpecies, extantSpecies }: ComparisonArgs) =>
  `/genelist/${segment}/${encodeURIComponent(ancestralSpecies)}/${encodeURIComponent(extantSpecies)}`

const tag = (segment: string, { ancestralSpecies, extantSpecies }: ComparisonArgs) => [
  { type: 'Comparison' as const, id: `${segment}:${ancestralSpecies}:${extantSpecies}` },
]

export const comparisonApiSlice = apiService.injectEndpoints({
  endpoints: builder => ({
    getInheritedGenes: builder.query<InheritedGene[], ComparisonArgs>({
      query: args => path('gene-pass', args),
      transformResponse: (response: AgbEnvelope<InheritedRow>) =>
        unwrapLists(response).map(row => ({
          ptn: row.ptn,
          name: row.name,
          descentPtns: splitList(row.descent_ptns),
          descentGeneNames: splitList(row.descent_gnames),
          descentLongIds: splitList(row.descent_longIds),
        })),
      providesTags: (_r, _e, args) => tag('gene-pass', args),
    }),

    getLostGenes: builder.query<LostGene[], ComparisonArgs>({
      query: args => path('gene-loss', args),
      transformResponse: (response: AgbEnvelope<LostGene>) => unwrapLists(response),
      providesTags: (_r, _e, args) => tag('gene-loss', args),
    }),

    getGainedGenes: builder.query<GainedGene[], ComparisonArgs>({
      query: args => path('gene-gain', args),
      transformResponse: (response: AgbEnvelope<GainedGene>) => unwrapLists(response),
      providesTags: (_r, _e, args) => tag('gene-gain', args),
    }),

    /** Keyed on the extant species alone — there is no ancestral counterpart. */
    getUnmodeledGenes: builder.query<UnmodeledGene[], string>({
      query: extantSpecies => `/genelist/gene-no-model/${encodeURIComponent(extantSpecies)}`,
      transformResponse: (response: AgbEnvelope<UnmodeledGene>) => unwrapLists(response),
      providesTags: (_r, _e, extantSpecies) => [
        { type: 'Comparison' as const, id: `gene-no-model:${extantSpecies}` },
      ],
    }),
  }),
})

export const {
  useGetInheritedGenesQuery,
  useGetLostGenesQuery,
  useGetGainedGenesQuery,
  useGetUnmodeledGenesQuery,
} = comparisonApiSlice
