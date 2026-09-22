import type React from 'react'
import { Modal } from '@mantine/core'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import type { DialogComponent } from './dialogSlice'
import { closeDialog, selectDialogState } from './dialogSlice'

interface GlobalDialogProps {
  componentMap: Partial<Record<DialogComponent, React.ComponentType<any>>>
}

/**
 * The single mounted `<Modal>`. Features dispatch `openDialog({ component })`
 * instead of importing dialog components, which keeps the gene list from
 * pulling the gene-detail bundle in just to open a preview.
 */
const GlobalDialog: React.FC<GlobalDialogProps> = ({ componentMap }) => {
  const dispatch = useAppDispatch()
  const { open, size, component, customProps, preventBackdropClose, bodyScroll } =
    useAppSelector(selectDialogState)

  const Component = component ? componentMap[component] : undefined

  return (
    <Modal
      opened={open && Boolean(Component)}
      onClose={() => dispatch(closeDialog())}
      size={size}
      closeOnClickOutside={!preventBackdropClose}
      closeOnEscape={!preventBackdropClose}
    >
      <div className={bodyScroll === 'auto' ? 'max-h-[80vh] overflow-y-auto' : ''}>
        {Component && <Component {...customProps} />}
      </div>
    </Modal>
  )
}

export default GlobalDialog
