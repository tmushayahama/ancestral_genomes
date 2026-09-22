import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'

export type SpeciesTreeView = 'nested' | 'expandable'

/**
 * Client-only species state. Server data lives in `speciesApiSlice`; this holds
 * what the Angular `SpeciesService` kept in mutable fields (`activeSpecies`)
 * plus the tree's collapse state, which has to survive navigating between
 * species in the right-hand pane.
 */
export interface SpeciesUiState {
  activeSpecies: string | null
  view: SpeciesTreeView
  /** Node ids that are collapsed. Empty set == fully expanded, as on load. */
  collapsedIds: string[]
}

const initialState: SpeciesUiState = {
  activeSpecies: null,
  view: 'nested',
  collapsedIds: [],
}

export const speciesSlice = createSlice({
  name: 'species',
  initialState,
  reducers: {
    setActiveSpecies: (state, action: PayloadAction<string | null>) => {
      state.activeSpecies = action.payload
    },
    setSpeciesTreeView: (state, action: PayloadAction<SpeciesTreeView>) => {
      state.view = action.payload
    },
    toggleSpeciesNode: (state, action: PayloadAction<string>) => {
      const index = state.collapsedIds.indexOf(action.payload)
      if (index === -1) state.collapsedIds.push(action.payload)
      else state.collapsedIds.splice(index, 1)
    },
    expandAllSpecies: state => {
      state.collapsedIds = []
    },
  },
})

export const { setActiveSpecies, setSpeciesTreeView, toggleSpeciesNode, expandAllSpecies } =
  speciesSlice.actions

export const selectActiveSpecies = (state: { species: SpeciesUiState }) =>
  state.species.activeSpecies
export const selectSpeciesTreeView = (state: { species: SpeciesUiState }) => state.species.view
export const selectCollapsedIds = (state: { species: SpeciesUiState }) => state.species.collapsedIds

export default speciesSlice.reducer
