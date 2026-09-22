/**
 * Speciation-time buckets (millions of years ago) used to colour species-tree
 * nodes and to render the tree legend. Ported verbatim from
 * `SpeciesService.timescaleLegend` in the Angular app.
 */
export interface TimescaleBucket {
  color: string
  min: number
  max: number
  label: string
}

export const TIMESCALE_LEGEND: TimescaleBucket[] = [
  { color: 'black', min: 0, max: 0.5, label: '0' },
  { color: 'blue', min: 1, max: 50, label: '1 - 50' },
  { color: 'cyan', min: 51, max: 200, label: '51 - 200' },
  { color: 'green', min: 201, max: 500, label: '201 - 500' },
  { color: 'orange', min: 501, max: 1000, label: '501 - 1000' },
  { color: 'purple', min: 1001, max: 2000, label: '1001 - 2000' },
  { color: 'red', min: 2001, max: 8000, label: '2001+' },
]

/**
 * First bucket whose `max` the timescale falls under; bucket 0 for anything
 * non-numeric. Matches the Angular `_buildTimescaleColor` behaviour, including
 * its fall-through to bucket 0 for values above the last `max`.
 */
export const timescaleBucket = (timescale?: number | string | null): TimescaleBucket => {
  const value = Number(timescale)
  if (Number.isNaN(value)) return TIMESCALE_LEGEND[0]

  return TIMESCALE_LEGEND.find(bucket => value < bucket.max) ?? TIMESCALE_LEGEND[0]
}
