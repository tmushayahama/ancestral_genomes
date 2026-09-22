import { describe, expect, it } from 'vitest'
import { toCsv } from '@/@agb.core/utils/csv'

interface Row {
  ptn: string
  name: string
  descendants: string[]
}

const rows: Row[] = [
  { ptn: 'PTN1', name: 'Kinase, alpha', descendants: ['A', 'B'] },
  { ptn: 'PTN2', name: 'Says "hi"', descendants: [] },
]

describe('toCsv', () => {
  it('writes a header row from the column definitions', () => {
    const csv = toCsv(rows, [
      { header: 'Public ID', value: 'ptn' },
      { header: 'Protein name', value: 'name' },
    ])

    expect(csv.split('\n')[0]).toBe('Public ID,Protein name')
  })

  it('quotes cells containing commas or quotes', () => {
    const csv = toCsv(rows, [{ header: 'Protein name', value: 'name' }])

    expect(csv.split('\n')[1]).toBe('"Kinase, alpha"')
    expect(csv.split('\n')[2]).toBe('"Says ""hi"""')
  })

  it('joins array values rather than printing [object Object]', () => {
    const csv = toCsv(rows, [{ header: 'Descendants', value: 'descendants' }])

    expect(csv.split('\n')[1]).toBe('A; B')
  })

  it('accepts a projection for computed columns', () => {
    const csv = toCsv(rows, [{ header: 'Count', value: row => row.descendants.length }])

    expect(csv.split('\n')[1]).toBe('2')
  })
})
