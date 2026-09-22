import type React from 'react'
import { useAppDispatch } from '@/app/hooks'
import { closeDialog } from '@/@agb.core/components/dialog/dialogSlice'
import DialogHeader from '@/@agb.core/components/dialog/DialogHeader'
import { useGetGeneQuery } from '../slices/genesApiSlice'
import { isAncestral } from '../models/gene'
import GeneDetailContent from './GeneDetailContent'

interface GeneDetailDialogProps {
  ptn: string
}

/**
 * Preview shown when a gene-list row is clicked. Renders the same content as
 * `GeneDetailPage`; the page is the shareable form of it.
 */
const GeneDetailDialog: React.FC<GeneDetailDialogProps> = ({ ptn }) => {
  const dispatch = useAppDispatch()
  const { data: gene } = useGetGeneQuery(ptn)

  const kind = gene ? (isAncestral(gene) ? 'ancestral gene' : 'extant gene') : ''

  return (
    <div className="flex flex-col">
      <DialogHeader
        title={kind ? `${ptn} (${kind})` : ptn}
        fullPageHref={`/genes/${encodeURIComponent(ptn)}`}
        onClose={() => dispatch(closeDialog())}
      />
      <GeneDetailContent ptn={ptn} />
    </div>
  )
}

export default GeneDetailDialog
