import type React from 'react'
import { useEffect } from 'react'
import { notifications } from '@mantine/notifications'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { hideToast, selectToast } from './toastSlice'

const COLORS = {
  info: 'accent',
  success: 'green',
  warning: 'orange',
  error: 'red',
} as const

/**
 * Bridges the toast slice to Mantine's imperative notification system, so
 * features stay declarative (`dispatch(showToast(...))`) and never import
 * `notifications` directly.
 */
const GlobalToast: React.FC = () => {
  const dispatch = useAppDispatch()
  const { open, level, title, message } = useAppSelector(selectToast)

  useEffect(() => {
    if (!open) return

    notifications.show({ color: COLORS[level], title, message })
    dispatch(hideToast())
  }, [open, level, title, message, dispatch])

  return null
}

export default GlobalToast
