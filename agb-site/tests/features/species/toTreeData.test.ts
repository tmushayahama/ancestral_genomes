import { describe, expect, it } from 'vitest'
import { SYNTHETIC_ROOT_ID, toTreeData } from '@/features/species/components/SpeciesExpandableTree'
import { buildSpeciesTree } from '@/features/species/slices/speciesApiSlice'
import { buildSpeciesRow } from '@tests/fixtures/builders'

const rows = [
  buildSpeciesRow({
    id: '1',
    short_name: 'LUCA',
    long_name: 'LUCA',
    parent_id: '',
    timescale: '4200',
  }),
  buildSpeciesRow({ id: '2', short_name: 'Eukaryota', long_name: 'Eukaryota', parent_id: '1' }),
]

describe('toTreeData', () => {
  it('returns null for an empty tree so the drawing code can bail out', () => {
    expect(toTreeData([])).toBeNull()
  })

  it('uses the single root directly, without wrapping it', () => {
    const root = toTreeData(buildSpeciesTree(rows))

    expect(root?.shortName).toBe('LUCA')
    expect(root?.children).toHaveLength(1)
    expect(root?.children?.[0].longName).toBe('Eukaryota')
  })

  it('carries the timescale colour through for the node fill', () => {
    const root = toTreeData(buildSpeciesTree(rows))

    // 4200 mya sits in the 2001+ bucket.
    expect(root?.color).toBe('red')
  })

  it('adds a synthetic parent when the API returns several roots', () => {
    const twoRoots = buildSpeciesTree([
      buildSpeciesRow({ id: '1', short_name: 'Bacteria', parent_id: '' }),
      buildSpeciesRow({ id: '2', short_name: 'Archaea', parent_id: '' }),
    ])

    const root = toTreeData(twoRoots)

    expect(root?.id).toBe(SYNTHETIC_ROOT_ID)
    expect(root?.children).toHaveLength(2)
  })

  it('leaves childless nodes without a children array, which is what d3 expects', () => {
    const root = toTreeData(buildSpeciesTree(rows))

    expect(root?.children?.[0].children).toBeUndefined()
  })
})
