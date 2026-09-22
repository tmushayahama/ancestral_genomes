import type React from 'react'
import { Button } from '@mantine/core'
import { MdFileDownload } from 'react-icons/md'
import { EXTERNAL_LINKS } from '@/@agb.core/data/constants'
import PageContainer from './PageContainer'

const DownloadsPage: React.FC = () => (
  <PageContainer title="Downloads">
    <p>
      The complete set of ancestral and extant genes is available as a single gzipped CSV file,
      hosted on Zenodo.
    </p>
    <Button
      component="a"
      href={EXTERNAL_LINKS.ALL_GENES_DOWNLOAD}
      size="sm"
      color="accent"
      leftSection={<MdFileDownload />}
    >
      Download all data in CSV format
    </Button>
  </PageContainer>
)

export default DownloadsPage
