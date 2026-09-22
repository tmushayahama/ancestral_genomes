import type React from 'react'
import { Link } from 'react-router-dom'
import { ActionIcon, Button, Group, Tooltip } from '@mantine/core'
import { MdFileDownload } from 'react-icons/md'
import GlobalProgressBar from '@/@agb.core/components/loading-overlay/GlobalProgressBar'

const Toolbar: React.FC = () => (
  <header className="bg-primary-500 relative flex h-12 shrink-0 items-center px-4 text-white shadow-md">
    <GlobalProgressBar />

    <Link to="/" className="text-lg font-medium tracking-wide text-white no-underline">
      Ancestral Genomes
    </Link>

    <div className="grow" />

    <Group gap="xs">
      <Button component={Link} to="/about" variant="subtle" color="gray.0" size="sm">
        About
      </Button>
      <Tooltip label="Downloads">
        <ActionIcon component={Link} to="/downloads" color="gray.0" aria-label="Downloads">
          <MdFileDownload />
        </ActionIcon>
      </Tooltip>
    </Group>
  </header>
)

export default Toolbar
