import type React from 'react'
import { MdCircle, MdHistory } from 'react-icons/md'
import { TIMESCALE_LEGEND } from '@/@agb.core/data/timescale'

interface TimescaleLegendProps {
  /**
   * `history` on the nested tree, `dot` on the expandable one — the same split
   * the Angular templates made (`history` vs `brightness_1`).
   */
  icon?: 'history' | 'dot'
  className?: string
}

/**
 * Colour key for the speciation-time buckets. Positioned by its parent: on both
 * species trees it floats over the bottom-left corner of the tree, as it did on
 * the old site, rather than taking a strip of layout for itself.
 */
const TimescaleLegend: React.FC<TimescaleLegendProps> = ({ icon = 'history', className = '' }) => {
  const Icon = icon === 'dot' ? MdCircle : MdHistory

  return (
    <div
      className={`border-agb-border bg-agb-legend-bg pointer-events-none absolute bottom-2.5 left-2.5 z-20 w-[94px] rounded-sm border p-[5px] shadow-lg backdrop-blur-[2px] ${className}`}
    >
      <div className="mb-[5px] text-[10px] leading-none font-semibold whitespace-nowrap text-gray-700">
        TIMESCALE (MYA)
      </div>
      <ul>
        {TIMESCALE_LEGEND.map(bucket => (
          <li
            key={bucket.label}
            className="flex h-5 items-center gap-[5px] text-[10px] leading-5 text-gray-800"
          >
            <Icon size={12} style={{ color: bucket.color }} aria-hidden />
            {bucket.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default TimescaleLegend
