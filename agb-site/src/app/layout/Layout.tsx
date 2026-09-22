import type React from 'react'
import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { Loader } from '@mantine/core'
import Toolbar from './Toolbar'
import Footer from './Footer'
import GlobalDialog from '@/@agb.core/components/dialog/GlobalDialog'
import GlobalToast from '@/@agb.core/components/toast/GlobalToast'
import { DialogComponent } from '@/@agb.core/components/dialog/dialogSlice'
import GeneDetailDialog from '@/features/genes/components/GeneDetailDialog'
import SpeciesDetailDialog from '@/features/species/components/SpeciesDetailDialog'

/**
 * Dialog content links to other routes, so `GlobalDialog` has to live inside
 * the router — mounted beside `RouterProvider` it renders without router
 * context and every `<Link>` in a dialog throws.
 */
const DIALOG_COMPONENTS: Partial<Record<DialogComponent, React.ComponentType<any>>> = {
  [DialogComponent.GENE_DETAIL]: GeneDetailDialog,
  [DialogComponent.SPECIES_DETAIL]: SpeciesDetailDialog,
}

/**
 * App shell: fixed toolbar, a flexible content area that owns its own
 * scrolling, and a footer. The Angular layout hid the footer per route via
 * `NoctuaConfigService`; here every page is inside the same shell and the
 * browse view simply fills the content area instead.
 */
const Layout: React.FC = () => (
  <div className="flex h-full flex-col">
    <Toolbar />
    <main className="min-h-0 grow overflow-auto">
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center">
            <Loader color="accent" />
          </div>
        }
      >
        <Outlet />
      </Suspense>
    </main>
    <Footer />
    <GlobalDialog componentMap={DIALOG_COMPONENTS} />
    <GlobalToast />
  </div>
)

export default Layout
