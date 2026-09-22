import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'
import { Navigate } from 'react-router-dom'
import Layout from '@/app/layout/Layout'
import { ROOT_SPECIES } from '@/@agb.core/data/constants'
import { LegacyGeneListRedirect, LegacyOutletRedirect } from './LegacyRedirects'

// Static pages are small and always reachable from the footer, so they ship in
// the main chunk. The data-heavy views are split.
import HomePage from '@/features/pages/components/HomePage'
import AboutPage from '@/features/pages/components/AboutPage'
import ContactUsPage from '@/features/pages/components/ContactUsPage'
import PrivacyPolicyPage from '@/features/pages/components/PrivacyPolicyPage'
import DisclaimerPage from '@/features/pages/components/DisclaimerPage'
import ReleaseInfoPage from '@/features/pages/components/ReleaseInfoPage'
import DownloadsPage from '@/features/pages/components/DownloadsPage'
import NotFoundPage from '@/features/pages/components/NotFoundPage'

const SpeciesBrowserPage = lazy(() => import('@/features/species/components/SpeciesBrowserPage'))
const SpeciesDetailPage = lazy(() => import('@/features/species/components/SpeciesDetailPage'))
const SpeciesExpandableTreePage = lazy(
  () => import('@/features/species/components/SpeciesExpandableTreePage')
)
const GeneDetailPage = lazy(() => import('@/features/genes/components/GeneDetailPage'))
const GeneTreePage = lazy(() => import('@/features/geneTree/components/GeneTreePage'))
const GenomeComparisonPage = lazy(
  () => import('@/features/comparison/components/GenomeComparisonPage')
)

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },

      // --- species -------------------------------------------------------
      // `/species/:species` is the browse view: tree on the left, that
      // species' gene list on the right, with the proxy species in `?proxy=`.
      { path: 'species', element: <Navigate to={`/species/${ROOT_SPECIES}`} replace /> },
      { path: 'species/expandable', element: <SpeciesExpandableTreePage /> },
      { path: 'species/genes/*', element: <LegacyOutletRedirect /> },
      { path: 'species/:species', element: <SpeciesBrowserPage /> },
      { path: 'species/:species/info', element: <SpeciesDetailPage /> },

      // --- genes ---------------------------------------------------------
      { path: 'genes/genome-comparison/:extant/:ancestral', element: <GenomeComparisonPage /> },
      { path: 'genes/gene-tree/:pthr/:ptn', element: <GeneTreePage /> },
      { path: 'genes/:ptn', element: <GeneDetailPage /> },
      { path: 'genes/:species/:proxySpecies', element: <LegacyGeneListRedirect /> },

      // --- static content ------------------------------------------------
      { path: 'about', element: <AboutPage /> },
      { path: 'contact-us', element: <ContactUsPage /> },
      { path: 'privacy-policy', element: <PrivacyPolicyPage /> },
      { path: 'disclaimer', element: <DisclaimerPage /> },
      { path: 'release-info', element: <ReleaseInfoPage /> },
      { path: 'downloads', element: <DownloadsPage /> },

      // --- retired experimental tree views -------------------------------
      { path: 'species/vertical-tree', element: <Navigate to="/species" replace /> },
      { path: 'species/horizontal-tree', element: <Navigate to="/species" replace /> },
      { path: 'species/expandable-tree', element: <Navigate to="/species/expandable" replace /> },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
