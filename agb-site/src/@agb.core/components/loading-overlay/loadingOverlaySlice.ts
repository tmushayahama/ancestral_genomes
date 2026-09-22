import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'

/**
 * Replaces the Angular `NoctuaProgressBarService` + toolbar router-event
 * subscription. `pending` is a count, not a boolean, so overlapping requests
 * (the gene list fires three in parallel) don't clear each other's overlay.
 */
export interface LoadingOverlayState {
  pending: number
  message: string
}

const initialState: LoadingOverlayState = { pending: 0, message: '' }

export const loadingOverlaySlice = createSlice({
  name: 'loadingOverlay',
  initialState,
  reducers: {
    startLoading: (state, action: PayloadAction<string | undefined>) => {
      state.pending += 1
      if (action.payload) state.message = action.payload
    },
    stopLoading: state => {
      state.pending = Math.max(0, state.pending - 1)
      if (state.pending === 0) state.message = ''
    },
    resetLoading: () => initialState,
  },
})

export const { startLoading, stopLoading, resetLoading } = loadingOverlaySlice.actions

export const selectIsLoading = (state: { loadingOverlay: LoadingOverlayState }) =>
  state.loadingOverlay.pending > 0

export const selectLoadingMessage = (state: { loadingOverlay: LoadingOverlayState }) =>
  state.loadingOverlay.message

export default loadingOverlaySlice.reducer
