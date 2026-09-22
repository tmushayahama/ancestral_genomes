import type { Middleware } from '@reduxjs/toolkit'
import { isPending, isFulfilled, isRejected } from '@reduxjs/toolkit'
import { startLoading, stopLoading } from './loadingOverlaySlice'

const isQueryAction = (action: unknown): action is { type: string } =>
  typeof (action as { type?: unknown })?.type === 'string' &&
  (action as { type: string }).type.startsWith('agbApi/executeQuery')

/**
 * Ties the RTK Query request lifecycle to the global progress bar so features
 * never have to toggle it themselves — the Angular app had every component
 * flipping `showLoadingBar` by hand off router events.
 */
export const loadingOverlayMiddleware: Middleware = store => next => action => {
  if (isQueryAction(action)) {
    if (isPending(action)) store.dispatch(startLoading())
    else if (isFulfilled(action) || isRejected(action)) store.dispatch(stopLoading())
  }

  return next(action)
}
