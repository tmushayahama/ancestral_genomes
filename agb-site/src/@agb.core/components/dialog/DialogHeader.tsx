import type React from 'react'
import { ActionIcon, Group, Text } from '@mantine/core'
import { MdClose, MdOpenInFull } from 'react-icons/md'

interface DialogHeaderProps {
  title: React.ReactNode
  /** Route to the standalone page for the same record, if there is one. */
  fullPageHref?: string
  onClose: () => void
}

const DialogHeader: React.FC<DialogHeaderProps> = ({ title, fullPageHref, onClose }) => (
  <Group justify="space-between" wrap="nowrap" className="bg-primary-500 px-3 py-2 text-white">
    <Text fw={500} size="sm" className="truncate">
      {title}
    </Text>
    <Group gap={4} wrap="nowrap">
      {fullPageHref && (
        <ActionIcon
          component="a"
          href={fullPageHref}
          target="_blank"
          rel="noreferrer"
          color="gray.0"
          aria-label="Open full page view"
        >
          <MdOpenInFull />
        </ActionIcon>
      )}
      <ActionIcon color="gray.0" onClick={onClose} aria-label="Close dialog">
        <MdClose />
      </ActionIcon>
    </Group>
  </Group>
)

export default DialogHeader
