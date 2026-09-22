import type React from 'react'
import { useEffect, useRef } from 'react'
import { ActionIcon, Tooltip } from '@mantine/core'
import { MdChevronRight, MdExpandMore, MdHistory, MdMoreHoriz } from 'react-icons/md'
import type { SpeciesNode } from '../models/species'

/** Matches the Angular tree's `matTreeNodePaddingIndent="10"`. */
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
 * One tree row, rendered recursively. Row metrics come from the old site:
 * 25px tall, 12px label, 10px muted gene count, and the yellow-green selection
 * highlight.
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
        className={`flex h-[25px] cursor-pointer items-center gap-0.5 pr-[5px] text-xs text-black transition-colors ${
          isActive ? 'bg-agb-highlight font-medium' : 'hover:bg-black/10'
        }`}
        style={{ paddingLeft: node.level * INDENT_PX }}
      >
        {hasChildren ? (
          <ActionIcon
            size={25}
            radius="sm"
            onClick={event => {
              event.stopPropagation()
              onToggle(node.id)
            }}
            aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${node.long_name}`}
          >
            {isCollapsed ? <MdChevronRight size={16} /> : <MdExpandMore size={16} />}
          </ActionIcon>
        ) : (
          <span className="inline-block w-[25px] shrink-0" aria-hidden />
        )}

        <Tooltip
          label={node.timescale ? `${node.timescale} mya` : 'Extant species'}
          openDelay={400}
        >
          <span
            className="flex w-[25px] shrink-0 items-center justify-center"
            style={{ color: node.timescaleBucket.color }}
          >
            <MdHistory size={18} aria-hidden />
          </span>
        </Tooltip>

        <span className="grow truncate" title={node.long_name}>
          {node.long_name}
        </span>

        <span className="text-agb-muted w-10 shrink-0 text-right text-[10px] tabular-nums">
          {node.gene_count ? node.gene_count.toLocaleString('en-US') : ''}
        </span>

        <ActionIcon
          size={20}
          radius="sm"
          className="shrink-0"
          onClick={event => {
            event.stopPropagation()
            onShowInfo(node.short_name)
          }}
          aria-label={`Information about ${node.long_name}`}
        >
          <MdMoreHoriz size={16} />
        </ActionIcon>
      </div>

      {hasChildren && !isCollapsed && (
        <ul role="group">
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
