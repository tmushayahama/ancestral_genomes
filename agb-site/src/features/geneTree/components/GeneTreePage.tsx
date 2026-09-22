import type React from 'react'
import { useParams } from 'react-router-dom'
import { ENVIRONMENT } from '@/@agb.core/data/constants'

/**
 * Embeds the PANTHER family tree viewer. The Angular version needed a
 * `DomSanitizer` pipe to allow the iframe URL; React has no such guard, so the
 * URL is built from constants and encoded params rather than interpolated raw.
 */
const GeneTreePage: React.FC = () => {
  const { pthr = '', ptn = '' } = useParams()

  const src = `${ENVIRONMENT.geneTreeViewerUrl}?book=${encodeURIComponent(
    pthr
  )}&seq=${encodeURIComponent(ptn)}`

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-2 text-sm">
        <span className="font-medium">{pthr}</span>
        <span className="text-gray-500">gene family tree</span>
        <span className="grow" />
        <span className="text-gray-500">{ptn}</span>
      </div>
      <iframe
        className="min-h-0 w-full grow border-0"
        src={src}
        title={`PANTHER family tree for ${pthr}`}
      />
    </div>
  )
}

export default GeneTreePage
