import type React from 'react'
import { useEffect, useRef } from 'react'
import { ActionIcon, Tooltip } from '@mantine/core'
import { MdChevronRight, MdExpandMore, MdHistory, MdMoreHoriz } from 'react-icons/md'
import type { SpeciesNode } from '../models/species'

const INDENT_PX = 10

interface SpeciesTreeRowProps {
  node: SpeciesNode
  activeSpecies: string | null
  collapsedIds: string[]
  onSelect: (shortName: string) => void
  onToggle: (id: string) => void
  onShowInfo: (shortName: string) => void
}

/**
 * One tree row, rendered recursively. A flat + virtualised list would be
 * faster, but the tree is ~250 nodes and ships fully expanded, so recursion
 * keeps the markup honest about the hierarchy for screen readers.
 */
const SpeciesTreeRow: React.FC<SpeciesTreeRowProps> = ({
  node,
  activeSpecies,
  collapsedIds,
  onSelect,
  onToggle,
  onShowInfo,
}) => {
  const rowRef = useRef<HTMLDivElement>(null)
  const hasChildren = node.children.length > 0
  const isCollapsed = collapsedIds.includes(node.id)
  const isActive = activeSpecies === node.short_name

  // Deep-linking to a species should reveal it, not leave it off-screen.
  useEffect(() => {
    if (isActive) rowRef.current?.scrollIntoView({ block: 'nearest' })
  }, [isActive])

  return (
    <li role="none">
      <div
        ref={rowRef}
        role="treeitem"
        aria-expanded={hasChildren ? !isCollapsed : undefined}
        aria-selected={isActive}
        tabIndex={0}
        onClick={() => onSelect(node.short_name)}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onSelect(node.short_name)
          }
        }}
        className={`flex cursor-pointer items-center gap-1 py-0.5 pr-1 text-xs ${
          isActive ? 'bg-accent-100 font-medium' : 'hover:bg-gray-100'
        }`}
        style={{ paddingLeft: node.level * INDENT_PX + 4 }}
      >
        {hasChildren ? (
          <ActionIcon
            size="xs"
            onClick={event => {
              event.stopPropagation()
              onToggle(node.id)
            }}
            aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${node.long_name}`}
          >
            {isCollapsed ? <MdChevronRight /> : <MdExpandMore />}
          </ActionIcon>
        ) : (
          <span className="inline-block w-[22px]" aria-hidden />
        )}

        <Tooltip label={`${node.timescale} mya`} disabled={!node.timescale}>
          <span style={{ color: node.timescaleBucket.color }} className="flex items-center">
            <MdHistory aria-hidden />
          </span>
        </Tooltip>

        <span className="grow truncate" title={node.long_name}>
          {node.long_name}
        </span>

        <span className="w-14 shrink-0 text-right text-gray-600 tabular-nums">
          {node.gene_count?.toLocaleString('en-US')}
        </span>

        <ActionIcon
          size="xs"
          onClick={event => {
            event.stopPropagation()
            onShowInfo(node.short_name)
          }}
          aria-label={`Information about ${node.long_name}`}
        >
          <MdMoreHoriz />
        </ActionIcon>
      </div>

      {hasChildren && !isCollapsed && (
        <ul role="group" className="list-none">
          {node.children.map(child => (
            <SpeciesTreeRow
              key={child.id}
              node={child}
              activeSpecies={activeSpecies}
              collapsedIds={collapsedIds}
              onSelect={onSelect}
              onToggle={onToggle}
              onShowInfo={onShowInfo}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

export default SpeciesTreeRow
