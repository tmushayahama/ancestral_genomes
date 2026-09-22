import type React from 'react'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Button, Loader, Menu, Text } from '@mantine/core'
import { useAppDispatch } from '@/app/hooks'
import { DialogComponent, openDialog } from '@/@agb.core/components/dialog/dialogSlice'
import { useGetSpeciesTreeQuery } from '../slices/speciesApiSlice'
import SpeciesExpandableTree from './SpeciesExpandableTree'
import TimescaleLegend from './TimescaleLegend'

const SpeciesExpandableTreePage: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { data: nodes = [], isLoading, isError } = useGetSpeciesTreeQuery()

  const handleShowInfo = useCallback(
    (shortName: string) =>
      dispatch(
        openDialog({
          component: DialogComponent.SPECIES_DETAIL,
          size: 'lg',
          customProps: { species: shortName },
        })
      ),
    [dispatch]
  )

  return (
    <div className="flex h-full flex-col">
      <div className="border-agb-border bg-agb-toolbar flex h-10 shrink-0 items-center gap-3 border-b px-[5px]">
        <Text fw={600} size="sm" className="pl-1">
          Expandable species tree
        </Text>
        <Text size="xs" c="dimmed">
          Left-click a node to expand or collapse it · right-click for species information · scroll
          to zoom, drag to pan
        </Text>
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

      <div className="relative min-h-0 grow bg-white">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader color="accent" />
          </div>
        ) : isError ? (
          <Alert color="red" className="m-4">
            Could not load the species tree.
          </Alert>
        ) : (
          <SpeciesExpandableTree nodes={nodes} onShowInfo={handleShowInfo} />
        )}
        <TimescaleLegend icon="dot" />
      </div>
    </div>
  )
}

export default SpeciesExpandableTreePage
