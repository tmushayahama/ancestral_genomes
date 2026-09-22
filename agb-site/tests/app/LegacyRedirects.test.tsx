import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { LegacyGeneListRedirect, LegacyOutletRedirect } from '@/app/routes/LegacyRedirects'
import { renderWithProviders } from '@tests/test-utils'

/** Prints where the redirect landed, so tests can assert on the final URL. */
const Landing = () => {
  const location = useLocation()
  return <div data-testid="landing">{`${location.pathname}${location.search}`}</div>
}

const renderAt = (entry: string) =>
  renderWithProviders(
    <Routes>
      <Route path="/species/genes/*" element={<LegacyOutletRedirect />} />
      <Route path="/genes/:species/:proxySpecies" element={<LegacyGeneListRedirect />} />
      <Route path="/species/:species" element={<Landing />} />
    </Routes>,
    { routes: [entry] }
  )

const landedAt = () => decodeURIComponent(screen.getByTestId('landing').textContent ?? '')

describe('legacy URL redirects', () => {
  it('translates the Angular named-outlet gene list URL', () => {
    renderAt('/species/genes/(list:genes/LUCA/default species)')

    expect(landedAt()).toBe('/species/LUCA?proxy=default species')
  })

  it('keeps a specific proxy species from the outlet URL', () => {
    renderAt('/species/genes/(list:genes/Eukaryota/Homo sapiens)')

    expect(landedAt()).toBe('/species/Eukaryota?proxy=Homo sapiens')
  })

  it('falls back to the root species when the outlet segment is unparseable', () => {
    renderAt('/species/genes/(list:garbage)')

    expect(landedAt()).toBe('/species/LUCA?proxy=default species')
  })

  it('translates the old standalone gene list route', () => {
    renderAt('/genes/Eukaryota/Homo sapiens')

    expect(landedAt()).toBe('/species/Eukaryota?proxy=Homo sapiens')
  })
})
