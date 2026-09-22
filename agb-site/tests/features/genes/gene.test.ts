import { describe, expect, it } from 'vitest'
import { cleanSequence, isAncestral } from '@/features/genes/models/gene'
import { buildGene, buildProxyGene } from '@tests/fixtures/builders'

describe('cleanSequence', () => {
  it('strips alignment padding and upper-cases the residues', () => {
    expect(cleanSequence('mkv..llg--ae_')).toBe('MKVLLGAE')
  })

  it('handles a missing sequence', () => {
    expect(cleanSequence(undefined)).toBe('')
  })
})

describe('isAncestral', () => {
  it('is true when the gene has proxy genes', () => {
    expect(isAncestral(buildGene({ proxy_genes: [buildProxyGene()] }))).toBe(true)
  })

  it('is false for an extant gene, which has none', () => {
    expect(isAncestral(buildGene({ proxy_genes: [] }))).toBe(false)
  })
})
