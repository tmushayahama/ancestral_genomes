import type React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { hierarchy, linkHorizontal, select, tree, zoom, zoomIdentity } from 'd3'
import type { HierarchyPointLink, HierarchyPointNode, ZoomTransform } from 'd3'
import type { SpeciesNode } from '../models/species'

/** Flat shape the drawing code works with, decoupled from the API model. */
export interface TreeDatum {
  id: string
  shortName: string
  longName: string
  geneCount: number
  timescale: number
  color: string
  children?: TreeDatum[]
}

/** Id of the stand-in parent used when the API returns more than one root. */
export const SYNTHETIC_ROOT_ID = '__root__'

const NODE_VERTICAL_GAP = 18
const NODE_HORIZONTAL_GAP = 220
const NODE_RADIUS = 5
const MARGIN = { top: 24, right: 220, bottom: 24, left: 120 }
/** Depth at which the tree starts collapsed — deep enough to show the shape. */
const INITIAL_DEPTH = 2

export const toTreeData = (nodes: SpeciesNode[]): TreeDatum | null => {
  const convert = (node: SpeciesNode): TreeDatum => ({
    id: node.id,
    shortName: node.short_name,
    longName: node.long_name,
    geneCount: node.gene_count,
    timescale: node.timescale,
    color: node.timescaleBucket.color,
    children: node.children.length ? node.children.map(convert) : undefined,
  })

  if (nodes.length === 0) return null
  if (nodes.length === 1) return convert(nodes[0])

  // The API can return several roots; give them a synthetic parent so the
  // layout has something to hang everything off.
  return {
    id: SYNTHETIC_ROOT_ID,
    shortName: 'root',
    longName: 'Tree of life',
    geneCount: 0,
    timescale: 0,
    color: 'black',
    children: nodes.map(convert),
  }
}

/** Ids more than `depth` levels from the root, which start collapsed. */
const collapsedBelow = (root: TreeDatum, depth: number): Set<string> => {
  const collapsed = new Set<string>()

  const walk = (node: TreeDatum, level: number) => {
    if (level >= depth && node.children?.length) collapsed.add(node.id)
    node.children?.forEach(child => walk(child, level + 1))
  }

  walk(root, 0)
  return collapsed
}

interface SpeciesExpandableTreeProps {
  nodes: SpeciesNode[]
  /** Right-click on a node; matches the old site's context-menu behaviour. */
  onShowInfo: (shortName: string) => void
}

/**
 * Collapsible d3 tree of the species hierarchy. A rewrite rather than a port:
 * the Angular component was 637 lines of d3 v3 plus jQuery, including a
 * drag-and-drop reordering mode that was never reachable from the UI.
 *
 * React owns mounting and the collapsed set; d3 owns the SVG. Redrawing from a
 * freshly built hierarchy on every toggle keeps the two from disagreeing about
 * who holds the tree state — the usual failure mode of the `_children` pattern.
 */
const SpeciesExpandableTree: React.FC<SpeciesExpandableTreeProps> = ({ nodes, onShowInfo }) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const transformRef = useRef<ZoomTransform>(zoomIdentity)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const root = useMemo(() => toTreeData(nodes), [nodes])

  // Start collapsed below `INITIAL_DEPTH` whenever the data itself changes.
  useEffect(() => {
    if (root) setCollapsed(collapsedBelow(root, INITIAL_DEPTH))
  }, [root])

  const toggle = useCallback((id: string) => {
    setCollapsed(previous => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  useEffect(() => {
    const svgElement = svgRef.current
    if (!svgElement || !root) return

    const layout = hierarchy<TreeDatum>(root, datum =>
      collapsed.has(datum.id) ? undefined : datum.children
    )
    const laidOut = tree<TreeDatum>().nodeSize([NODE_VERTICAL_GAP, NODE_HORIZONTAL_GAP])(layout)

    const allNodes = laidOut.descendants()
    const extentY = allNodes.map(node => node.x)
    const minY = Math.min(...extentY)
    const maxY = Math.max(...extentY)
    const maxDepth = Math.max(...allNodes.map(node => node.depth))

    const width = maxDepth * NODE_HORIZONTAL_GAP + MARGIN.left + MARGIN.right
    const height = maxY - minY + MARGIN.top + MARGIN.bottom

    const svg = select(svgElement)
    svg.selectAll('*').remove()
    svg.attr('width', '100%').attr('height', '100%').attr('viewBox', `0 0 ${width} ${height}`)

    const canvas = svg
      .append('g')
      .attr('transform', `translate(${MARGIN.left}, ${MARGIN.top - minY})`)

    const zoomed = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 3])
      .on('zoom', event => {
        transformRef.current = event.transform
        canvas.attr(
          'transform',
          `translate(${event.transform.x + MARGIN.left}, ${
            event.transform.y + MARGIN.top - minY
          }) scale(${event.transform.k})`
        )
      })

    svg.call(zoomed)
    // Preserve the viewer's pan/zoom across a collapse or expand.
    svg.call(zoomed.transform, transformRef.current)

    const linkPath = linkHorizontal<HierarchyPointLink<TreeDatum>, HierarchyPointNode<TreeDatum>>()
      .x(node => node.y)
      .y(node => node.x)

    canvas
      .append('g')
      .attr('fill', 'none')
      .attr('stroke', '#cbd5e1')
      .attr('stroke-width', 1)
      .selectAll('path')
      .data(laidOut.links())
      .join('path')
      .attr('d', linkPath)

    const node = canvas
      .append('g')
      .selectAll('g')
      .data(allNodes)
      .join('g')
      .attr('transform', datum => `translate(${datum.y}, ${datum.x})`)
      .attr('cursor', 'pointer')
      .on('click', (_event, datum) => {
        if (datum.data.children?.length) toggle(datum.data.id)
      })
      .on('contextmenu', (event: MouseEvent, datum) => {
        event.preventDefault()
        if (datum.data.id !== SYNTHETIC_ROOT_ID) onShowInfo(datum.data.shortName)
      })

    node
      .append('circle')
      .attr('r', NODE_RADIUS)
      .attr('fill', datum => (collapsed.has(datum.data.id) ? datum.data.color : '#ffffff'))
      .attr('stroke', datum => datum.data.color)
      .attr('stroke-width', 2)

    node
      .append('text')
      .attr('dy', '0.32em')
      .attr('x', NODE_RADIUS + 5)
      .attr('font-size', 11)
      .attr('fill', '#1f2937')
      .text(datum =>
        datum.data.geneCount
          ? `${datum.data.longName} (${datum.data.geneCount.toLocaleString('en-US')})`
          : datum.data.longName
      )

    node.append('title').text(datum => `${datum.data.longName} — ${datum.data.timescale} mya`)

    return () => {
      svg.on('.zoom', null)
      svg.selectAll('*').remove()
    }
  }, [root, collapsed, toggle, onShowInfo])

  return (
    <svg ref={svgRef} role="img" aria-label="Expandable species tree" className="h-full w-full" />
  )
}

export default SpeciesExpandableTree
