import type { Middleware } from '@reduxjs/toolkit'
import { combineSlices, configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import apiService from './apiService'
import { dialogSlice } from '@/@agb.core/components/dialog/dialogSlice'
import { toastSlice } from '@/@agb.core/components/toast/toastSlice'
import { loadingOverlaySlice } from '@/@agb.core/components/loading-overlay/loadingOverlaySlice'
import { loadingOverlayMiddleware } from '@/@agb.core/components/loading-overlay/loadingOverlayMiddleware'
import { speciesSlice } from '@/features/species/slices/speciesSlice'

// Endpoints are injected into `apiService` as a side effect of importing these
// modules. Importing them here means the cache is wired up before the first
// render, so a preloaded store in tests behaves like the real one.
import '@/features/species/slices/speciesApiSlice'
import '@/features/genes/slices/genesApiSlice'
import '@/features/comparison/slices/comparisonApiSlice'

const rootReducer = combineSlices({
  species: speciesSlice.reducer,
  dialog: dialogSlice.reducer,
  toast: toastSlice.reducer,
  loadingOverlay: loadingOverlaySlice.reducer,
  [apiService.reducerPath]: apiService.reducer,
})

const middlewares: Middleware[] = [apiService.middleware, loadingOverlayMiddleware]

export type RootState = ReturnType<typeof rootReducer>

export const makeStore = (preloadedState?: Partial<RootState>) => {
  const store = configureStore({
    reducer: rootReducer,
    middleware: getDefaultMiddleware => getDefaultMiddleware().concat(middlewares),
    preloadedState,
  })
  setupListeners(store.dispatch)
  return store
}

export const store = makeStore()

export type AppStore = typeof store
export type AppDispatch = AppStore['dispatch']
