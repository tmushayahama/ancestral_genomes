import { describe, expect, it } from 'vitest'
import { buildSpeciesTree } from '@/features/species/slices/speciesApiSlice'
import { buildSpeciesRow } from '@tests/fixtures/builders'

describe('buildSpeciesTree', () => {
  const rows = [
    buildSpeciesRow({ id: '1', short_name: 'LUCA', parent_id: '', timescale: '4200' }),
    buildSpeciesRow({ id: '2', short_name: 'Eukaryota', parent_id: '1', timescale: '1800' }),
    buildSpeciesRow({ id: '3', short_name: 'Opisthokonta', parent_id: '2', timescale: '1100' }),
    buildSpeciesRow({ id: '4', short_name: 'HUMAN', parent_id: '3', timescale: '0' }),
  ]

  it('nests rows under the root, which is the one with an empty parent_id', () => {
    const tree = buildSpeciesTree(rows)

    expect(tree).toHaveLength(1)
    expect(tree[0].short_name).toBe('LUCA')
    expect(tree[0].children[0].short_name).toBe('Eukaryota')
    expect(tree[0].children[0].children[0].children[0].short_name).toBe('HUMAN')
  })

  it('numbers levels by depth', () => {
    const tree = buildSpeciesTree(rows)

    expect(tree[0].level).toBe(0)
    expect(tree[0].children[0].level).toBe(1)
    expect(tree[0].children[0].children[0].level).toBe(2)
  })

  it('assigns a timescale bucket to every node', () => {
    const tree = buildSpeciesTree(rows)

    // 4200 mya -> the 2001+ bucket.
    expect(tree[0].timescaleBucket.color).toBe('red')
    // 1800 mya -> the 1001-2000 bucket.
    expect(tree[0].children[0].timescaleBucket.label).toBe('1001 - 2000')
    // Extant species are speciation time 0.
    expect(tree[0].children[0].children[0].children[0].timescaleBucket.label).toBe('0')
  })

  it('falls back to the first bucket past the end of the legend', () => {
    // Matches the Angular `_buildTimescaleColor` fall-through: nothing is
    // expected above 8000 mya, and a value that high buckets back to index 0.
    const [root] = buildSpeciesTree([
      buildSpeciesRow({ id: '1', parent_id: '', timescale: '9999' }),
    ])

    expect(root.timescaleBucket.label).toBe('0')
  })

  it('returns an empty tree rather than throwing when there are no rows', () => {
    expect(buildSpeciesTree([])).toEqual([])
  })
})
