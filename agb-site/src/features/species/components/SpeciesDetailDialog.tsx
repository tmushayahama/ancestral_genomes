import type React from 'react'
import { useAppDispatch } from '@/app/hooks'
import { closeDialog } from '@/@agb.core/components/dialog/dialogSlice'
import DialogHeader from '@/@agb.core/components/dialog/DialogHeader'
import SpeciesDetailContent from './SpeciesDetailContent'

interface SpeciesDetailDialogProps {
  species: string
}

/** Preview opened from the species tree's row menu and the gene-list header. */
const SpeciesDetailDialog: React.FC<SpeciesDetailDialogProps> = ({ species }) => {
  const dispatch = useAppDispatch()

  return (
    <div className="flex flex-col">
      <DialogHeader
        title={species}
        fullPageHref={`/species/${encodeURIComponent(species)}/info`}
        onClose={() => dispatch(closeDialog())}
      />
      <SpeciesDetailContent species={species} />
    </div>
  )
}

export default SpeciesDetailDialog
