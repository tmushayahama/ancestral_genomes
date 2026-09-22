import type React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@mantine/core'
import PageContainer from './PageContainer'

const NotFoundPage: React.FC = () => (
  <PageContainer title="Page not found">
    <p>The page you asked for does not exist, or has moved since it was linked.</p>
    <Button component={Link} to="/" size="sm">
      Back to the home page
    </Button>
  </PageContainer>
)

export default NotFoundPage
