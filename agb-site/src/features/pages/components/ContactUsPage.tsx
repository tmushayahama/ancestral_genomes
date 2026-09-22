import type React from 'react'
import { EXTERNAL_LINKS } from '@/@agb.core/data/constants'
import PageContainer from './PageContainer'

const ContactUsPage: React.FC = () => (
  <PageContainer title="Contact Us">
    <p>
      We are interested in receiving your comments and suggestions regarding the Ancestral Genomes
      website. You can contact us at{' '}
      <a href={`mailto:${EXTERNAL_LINKS.CONTACT_EMAIL}`}>{EXTERNAL_LINKS.CONTACT_EMAIL}</a>. Please
      include “ancestral genomes feedback” in the subject line.
    </p>
  </PageContainer>
)

export default ContactUsPage
