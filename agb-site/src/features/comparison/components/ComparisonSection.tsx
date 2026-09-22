import type React from 'react'
import { Accordion, Text } from '@mantine/core'

interface ComparisonSectionProps {
  value: string
  /** Header text, already formatted with its counts. */
  title: React.ReactNode
  /** Left colour bar, so the four sections stay distinguishable when scrolled. */
  accentClassName: string
  children: React.ReactNode
}

/**
 * One collapsible section of the genome comparison. Each section owns its own
 * query and count — in the Angular version all four wrote counts onto a shared
 * service, so the header numbers depended on which response landed last.
 */
const ComparisonSection: React.FC<ComparisonSectionProps> = ({
  value,
  title,
  accentClassName,
  children,
}) => (
  <Accordion.Item value={value} className={`border-l-4 ${accentClassName}`}>
    <Accordion.Control>
      <Text fw={500} size="sm">
        {title}
      </Text>
    </Accordion.Control>
    <Accordion.Panel>
      <div className="h-[28rem]">{children}</div>
    </Accordion.Panel>
  </Accordion.Item>
)

export default ComparisonSection
