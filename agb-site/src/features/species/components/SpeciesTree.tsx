import type React from 'react'
import { useNavigate } from 'react-router-dom'
import { ActionIcon, Button, Loader, Menu, Text, Tooltip } from '@mantine/core'
import { MdHelpOutline } from 'react-icons/md'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { DialogComponent, openDialog } from '@/@agb.core/components/dialog/dialogSlice'
import { useGetSpeciesTreeQuery } from '../slices/speciesApiSlice'
import { selectCollapsedIds, toggleSpeciesNode } from '../slices/speciesSlice'
import SpeciesTreeRow from './SpeciesTreeRow'
import TimescaleLegend from './TimescaleLegend'

const HELP_TEXT =
  'Select an ancestral genome by clicking a node in the tree, to retrieve the list of protein-coding genes in that genome (and their proxy genes in an extant genome).'

interface SpeciesTreeProps {
  /** Short name from the route; the tree highlights and reveals it. */
  activeSpecies: string | null
}

const SpeciesTree: React.FC<SpeciesTreeProps> = ({ activeSpecies }) => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const collapsedIds = useAppSelector(selectCollapsedIds)
  const { data: tree = [], isLoading, isError } = useGetSpeciesTreeQuery()

  // Selecting a species drops the proxy choice: proxies are per-species, so
  // carrying `?proxy=` across would ask for a species that may have no proxies.
  const handleSelect = (shortName: string) => navigate(`/species/${encodeURIComponent(shortName)}`)

  const handleShowInfo = (shortName: string) =>
    dispatch(
      openDialog({
        component: DialogComponent.SPECIES_DETAIL,
        size: 'lg',
        customProps: { species: shortName },
      })
    )

  return (
    <div className="flex h-full min-h-0 flex-col border-r border-gray-200 bg-white">
      <div className="flex shrink-0 items-center gap-1 border-b border-gray-200 px-3 py-2">
        <Text fw={600} size="sm">
          Nested View
        </Text>
        <Tooltip label={HELP_TEXT} w={340}>
          <ActionIcon size="sm" aria-label="About the species tree">
            <MdHelpOutline />
          </ActionIcon>
        </Tooltip>
        <span className="grow" />
        <Menu position="bottom-end">
          <Menu.Target>
            <Button variant="subtle">Change view</Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item onClick={() => navigate('/species')}>Nested view</Menu.Item>
            <Menu.Item onClick={() => navigate('/species/expandable')}>
              Expandable tree view
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </div>

      <div className="text-2xs flex shrink-0 items-center gap-1 border-b border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-medium text-gray-600">
        <span className="grow">Species</span>
        <span className="w-14 text-right">Genes</span>
        <span className="w-[22px] text-right">Info</span>
      </div>

      <div className="min-h-0 grow overflow-auto">
        {isLoading ? (
          <div className="flex h-full items-center justify-center py-10">
            <Loader color="accent" size="sm" />
          </div>
        ) : isError ? (
          <Text c="red" size="sm" className="px-3 py-6">
            Could not load the species tree.
          </Text>
        ) : (
          <ul role="tree" aria-label="Species" className="list-none">
            {tree.map(node => (
              <SpeciesTreeRow
                key={node.id}
                node={node}
                activeSpecies={activeSpecies}
                collapsedIds={collapsedIds}
                onSelect={handleSelect}
                onToggle={id => dispatch(toggleSpeciesNode(id))}
                onShowInfo={handleShowInfo}
              />
            ))}
          </ul>
        )}
      </div>

      <TimescaleLegend />
    </div>
  )
}

export default SpeciesTree
