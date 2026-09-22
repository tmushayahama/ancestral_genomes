import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { ENVIRONMENT } from '@/@agb.core/data/constants'

/**
 * Single RTK Query API for the AGB Express service. Feature slices extend it
 * with `injectEndpoints` so each feature owns its endpoints while sharing one
 * cache, one reducer and one middleware entry.
 *
 * The cache replaces the Angular services' hand-rolled state: `GenesService`,
 * `SpeciesService` and `GeneService` each held their last response in a field
 * and pushed change notifications through a `BehaviorSubject`. RTK Query does
 * that de-duplication, caching and subscription bookkeeping for us.
 */
export const apiService = createApi({
  reducerPath: 'agbApi',
  baseQuery: fetchBaseQuery({ baseUrl: ENVIRONMENT.agbApiUrl }),
  // Reference data changes only at release time, so hold it for a while rather
  // than refetching every time a component remounts.
  keepUnusedDataFor: 300,
  tagTypes: ['Species', 'Gene', 'Comparison'],
  endpoints: () => ({}),
})

export default apiService
