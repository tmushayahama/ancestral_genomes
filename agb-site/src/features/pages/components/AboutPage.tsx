import type React from 'react'
import { EXTERNAL_LINKS } from '@/@agb.core/data/constants'
import PageContainer from './PageContainer'

const AboutPage: React.FC = () => (
  <PageContainer title="About Ancestral Genomes">
    <p>
      Ancestral Genomes allows users to explore RECONSTRUCTED ANCESTRAL GENOMES, for a comprehensive
      set of over 100 reconstructed ancestral genomes spanning the tree of life. Ancestral
      protein-coding genes are explicitly represented (with stable identifiers) as nodes in
      reconciled gene trees, and their amino acid sequences are also reconstructed.
    </p>
    <p>
      At ancestralgenomes.org, users can browse the tree of life, and select a common ancestor of
      extant taxa (e.g. Opisthokonts, the common ancestor of animals and fungi). The site then
      retrieves all protein-coding genes that are inferred to have existed in the selected ancestral
      genome, based on a comprehensive library of over 15,000 gene trees. The gene trees are based
      on the{' '}
      <a href={EXTERNAL_LINKS.PANTHER_HOME} target="_blank" rel="noreferrer">
        PANTHER resource
      </a>
      , but are estimated with a modified algorithm that adds tree nodes for all common ancestral
      speciation events, enabling the trees to be used to infer the full complement of
      protein-coding genes present in a given common ancestor species.
    </p>
    <p>
      All ancestral genes are given stable identifiers (starting with PTN…). The reconstructed
      ancestral sequences are also available. Also, for each ancestral gene, we compute a “proxy
      gene” (the least diverged descendant) in a user-selected extant genome, e.g. the human genome.
      This enables users to trace the age of extant genes, as well as providing a way to analyze
      ancestral genomes by “projecting” the ancestral genes onto modern genomes. This can support,
      for example, Gene Ontology enrichment analysis. All data can be downloaded interactively by
      ancestral genome.
    </p>

    <h2>Please cite</h2>
    <p>
      <a href={EXTERNAL_LINKS.CITATION_DOI} target="_blank" rel="noreferrer">
        Ancestral Genomes: a resource for reconstructed ancestral genes and genomes across the tree
        of life.
      </a>
      <br />
      Xiaosong Huang, Laurent-Philippe Albou, Tremayne Mushayahama, Anushya Muruganujan, Haiming
      Tang, Paul D Thomas
      <br />
      Nucl. Acids Res. (2018) doi: 10.1093/nar/gky1009
    </p>

    <p>
      To contact the developers with questions or suggestions, please email us at{' '}
      <a href={`mailto:${EXTERNAL_LINKS.CONTACT_EMAIL}`}>{EXTERNAL_LINKS.CONTACT_EMAIL}</a>.
    </p>
  </PageContainer>
)

export default AboutPage
