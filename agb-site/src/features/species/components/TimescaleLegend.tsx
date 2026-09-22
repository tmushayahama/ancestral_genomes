import type React from 'react'
import { MdHistory } from 'react-icons/md'
import { TIMESCALE_LEGEND } from '@/@agb.core/data/timescale'

/** Colour key for the speciation-time dots on the species tree. */
const TimescaleLegend: React.FC = () => (
  <div className="shrink-0 border-t border-gray-200 bg-white px-3 py-2">
    <div className="mb-1 text-[10px] font-medium tracking-wide text-gray-500 uppercase">
      Timescale (mya)
    </div>
    <ul className="flex flex-wrap gap-x-3 gap-y-1">
      {TIMESCALE_LEGEND.map(bucket => (
        <li key={bucket.label} className="flex items-center gap-1 text-[11px] text-gray-700">
          <MdHistory style={{ color: bucket.color }} aria-hidden />
          {bucket.label}
        </li>
      ))}
    </ul>
  </div>
)

export default TimescaleLegend
