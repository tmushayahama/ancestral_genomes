import type React from 'react'
import { Paper, Text } from '@mantine/core'

interface InfoCardProps {
  title: React.ReactNode
  /** Rendered on the right of the header — a filter input, a link, an action. */
  action?: React.ReactNode
  /** Shown in place of the body when there is nothing to display. */
  emptyMessage?: string
  /** `false` renders `emptyMessage`. Defaults to "children were provided". */
  hasContent?: boolean
  noPadding?: boolean
  children?: React.ReactNode
}

/**
 * The `agb-card-simple` block the old detail templates repeated a dozen times:
 * a titled panel that falls back to "no information yet" when its field is
 * empty.
 */
const InfoCard: React.FC<InfoCardProps> = ({
  title,
  action,
  emptyMessage = 'no information yet',
  hasContent,
  noPadding = false,
  children,
}) => {
  const showContent = hasContent ?? Boolean(children)

  return (
    <Paper withBorder shadow="xs" radius="sm" className="mb-5 overflow-hidden bg-white">
      <div className="border-agb-card-border flex min-h-10 items-center justify-between gap-2 border-b p-2.5">
        <Text fw={700} size="sm">
          {title}
        </Text>
        {action}
      </div>
      {showContent ? (
        <div className={noPadding ? '' : 'p-2.5'}>{children}</div>
      ) : (
        <Text c="dimmed" fs="italic" size="xs" className="p-2.5">
          {emptyMessage}
        </Text>
      )}
    </Paper>
  )
}

export default InfoCard
