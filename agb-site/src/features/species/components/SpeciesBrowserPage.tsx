import type React from 'react'
import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useAppDispatch } from '@/app/hooks'
import GeneListPanel from '@/features/genes/components/GeneListPanel'
import { ROOT_SPECIES } from '@/@agb.core/data/constants'
import SpeciesTree from './SpeciesTree'
import { setActiveSpecies } from '../slices/speciesSlice'

/**
 * The browse view: species tree beside that species' gene list. Replaces the
 * Angular `angular-split` + named-router-outlet arrangement; the selected
 * species is a normal route param, so the two panes stay in sync through the
 * URL rather than through a service field.
 */
const SpeciesBrowserPage: React.FC = () => {
  const { species = ROOT_SPECIES } = useParams()
  const dispatch = useAppDispatch()

  // The route is the source of truth; the slice mirrors it so components that
  // aren't under the route (dialogs) can still read the current species.
  useEffect(() => {
    dispatch(setActiveSpecies(species))
  }, [species, dispatch])

  return (
    <PanelGroup direction="horizontal" className="h-full">
      <Panel defaultSize={30} minSize={18} className="min-h-0">
        <SpeciesTree activeSpecies={species} />
      </Panel>
      <PanelResizeHandle className="w-1.5 bg-gray-200 transition-colors hover:bg-gray-400" />
      <Panel defaultSize={70} minSize={30} className="min-h-0">
        <GeneListPanel species={species} />
      </Panel>
    </PanelGroup>
  )
}

export default SpeciesBrowserPage
