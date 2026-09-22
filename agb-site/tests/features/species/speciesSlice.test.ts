import { describe, expect, it } from 'vitest'
import {
  expandAllSpecies,
  setActiveSpecies,
  setSpeciesTreeView,
  speciesSlice,
  toggleSpeciesNode,
} from '@/features/species/slices/speciesSlice'

const initial = speciesSlice.getInitialState()
const reduce = speciesSlice.reducer

describe('speciesSlice', () => {
  it('starts fully expanded, which is how the tree renders on load', () => {
    expect(initial.collapsedIds).toEqual([])
    expect(initial.activeSpecies).toBeNull()
  })

  it('toggles a node into and out of the collapsed set', () => {
    const collapsed = reduce(initial, toggleSpeciesNode('7'))
    expect(collapsed.collapsedIds).toEqual(['7'])

    const expanded = reduce(collapsed, toggleSpeciesNode('7'))
    expect(expanded.collapsedIds).toEqual([])
  })

  it('collapses several nodes independently', () => {
    const state = ['3', '9', '12'].reduce((acc, id) => reduce(acc, toggleSpeciesNode(id)), initial)

    expect(state.collapsedIds).toEqual(['3', '9', '12'])
  })

  it('expandAllSpecies clears the collapsed set', () => {
    const collapsed = reduce(initial, toggleSpeciesNode('4'))

    expect(reduce(collapsed, expandAllSpecies()).collapsedIds).toEqual([])
  })

  it('tracks the active species and can clear it', () => {
    const active = reduce(initial, setActiveSpecies('LUCA'))
    expect(active.activeSpecies).toBe('LUCA')

    expect(reduce(active, setActiveSpecies(null)).activeSpecies).toBeNull()
  })

  it('switches the tree view', () => {
    expect(reduce(initial, setSpeciesTreeView('expandable')).view).toBe('expandable')
  })
})
