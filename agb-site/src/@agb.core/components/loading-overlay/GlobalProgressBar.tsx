import type React from 'react'
import { Progress } from '@mantine/core'
import { useAppSelector } from '@/app/hooks'
import { selectIsLoading } from './loadingOverlaySlice'

/**
 * Indeterminate bar pinned under the toolbar — the React equivalent of the
 * Angular `noctua-progress-bar`. Driven entirely by `loadingOverlayMiddleware`.
 */
const GlobalProgressBar: React.FC = () => {
  const loading = useAppSelector(selectIsLoading)

  if (!loading) return null

  return (
    <Progress
      value={100}
      size="xs"
      color="accent"
      animated
      className="absolute inset-x-0 top-0 z-50"
      aria-label="Loading"
    />
  )
}

export default GlobalProgressBar
