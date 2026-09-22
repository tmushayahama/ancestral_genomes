import type React from 'react'
import { Paper } from '@mantine/core'

interface PageContainerProps {
  title: string
  children: React.ReactNode
}

/** Shared frame for the static content pages. */
const PageContainer: React.FC<PageContainerProps> = ({ title, children }) => (
  <div className="mx-auto max-w-4xl px-4 py-8">
    <Paper withBorder shadow="sm" radius="sm" className="agb-prose px-6 py-6">
      <h1>{title}</h1>
      {children}
    </Paper>
  </div>
)

export default PageContainer
