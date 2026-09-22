import type { ColumnDef } from '@tanstack/react-table'
import type { CsvColumn } from '@/@agb.core/utils/csv'
import type { GainedGene, InheritedGene, LostGene, UnmodeledGene } from '../models/comparison'
import { displayProteinName } from '../models/comparison'

const PTN_COLUMN_WIDTH = 190

/** Descendant identifiers, one per line. The old table joined them with `<br>`
 *  into a string and pushed it through `[innerHtml]`. */
const IdList = ({ ids }: { ids: string[] }) => (
  <ul className="flex flex-col gap-0.5">
    {ids.map(id => (
      <li key={id} className="font-mono text-xs break-all">
        {id}
      </li>
    ))}
  </ul>
)

export const inheritedColumns: ColumnDef<InheritedGene, any>[] = [
  { accessorKey: 'ptn', header: 'Ancestral gene ID', size: PTN_COLUMN_WIDTH },
  {
    accessorKey: 'name',
    header: 'Ancestral protein name',
    size: 240,
    cell: ({ row }) => displayProteinName(row.original.name),
  },
  {
    id: 'descentLongIds',
    header: 'Extant protein PANTHER identifiers',
    enableSorting: false,
    cell: ({ row }) => <IdList ids={row.original.descentLongIds} />,
  },
]

export const inheritedExport: CsvColumn<InheritedGene>[] = [
  { header: 'Ancestral gene ID', value: 'ptn' },
  { header: 'Ancestral protein name', value: row => displayProteinName(row.name) },
  { header: 'Extant protein names', value: 'descentGeneNames' },
  { header: 'Extant PANTHER identifiers', value: 'descentLongIds' },
]

export const lostColumns: ColumnDef<LostGene, any>[] = [
  { accessorKey: 'ptn', header: 'Ancestral gene ID', size: PTN_COLUMN_WIDTH },
  {
    accessorKey: 'name',
    header: 'Protein name',
    cell: ({ row }) => displayProteinName(row.original.name),
  },
]

export const lostExport: CsvColumn<LostGene>[] = [
  { header: 'Ancestral gene ID', value: 'ptn' },
  { header: 'Protein name', value: row => displayProteinName(row.name) },
]

export const gainedColumns: ColumnDef<GainedGene, any>[] = [
  { accessorKey: 'ptn', header: 'Extant gene ID', size: PTN_COLUMN_WIDTH },
  {
    accessorKey: 'name',
    header: 'Protein name',
    cell: ({ row }) => displayProteinName(row.original.name),
  },
  { accessorKey: 'proxy_gene', header: 'PANTHER identifier' },
]

export const gainedExport: CsvColumn<GainedGene>[] = [
  { header: 'Extant gene ID', value: 'ptn' },
  { header: 'Protein name', value: row => displayProteinName(row.name) },
  { header: 'PANTHER identifier', value: 'proxy_gene' },
]

export const unmodeledColumns: ColumnDef<UnmodeledGene, any>[] = [
  { accessorKey: 'ptn', header: 'Extant gene ID', size: PTN_COLUMN_WIDTH },
  {
    accessorKey: 'name',
    header: 'Protein name',
    cell: ({ row }) => displayProteinName(row.original.name),
  },
  { accessorKey: 'proxy_gene', header: 'PANTHER identifier' },
]

export const unmodeledExport: CsvColumn<UnmodeledGene>[] = [
  { header: 'Extant gene ID', value: 'ptn' },
  { header: 'Protein name', value: row => displayProteinName(row.name) },
  { header: 'PANTHER identifier', value: 'proxy_gene' },
]
