import type React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@mantine/core'
import { EXTERNAL_LINKS, ROOT_SPECIES } from '@/@agb.core/data/constants'
import { RELEASE_INFO } from '../data/releaseInfo'

const HomePage: React.FC = () => (
  <div className="flex flex-col">
    <section className="bg-accent-700 px-6 py-12 text-center text-white">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-4 text-3xl font-medium">Ancestral Genomes Resource</h1>
        <p className="mb-6 text-base leading-relaxed">
          Comparative analysis of protein sequences from diverse extant species can infer the
          evolutionary history of protein coding genes and reconstruct the repertoire of protein
          coding genes in extinct ancestral species.
        </p>
        <Button component={Link} to={`/species/${ROOT_SPECIES}`} size="md" color="green">
          Browse via nested species list view
        </Button>
      </div>
    </section>

    <section className="mx-auto w-full max-w-5xl px-6 py-10">
      <p className="mb-8 text-center text-sm">
        <span className="font-medium text-red-600">NEW! </span>
        Ancestral Genomes is now updated with the latest release of{' '}
        <a
          className="text-accent-800 underline"
          href={EXTERNAL_LINKS.PANTHER_HOME}
          target="_blank"
          rel="noreferrer"
        >
          PANTHER library
        </a>{' '}
        (version {RELEASE_INFO.pantherVersion}).
      </p>

      <h2 className="mb-6 text-center text-2xl font-medium">Explore</h2>

      <div className="mb-10 grid gap-8 md:grid-cols-2">
        <div className="flex flex-col gap-6">
          <div>
            <h3 className="mb-2 text-lg font-medium">Browse the ancestral genomes</h3>
            <p className="text-sm leading-relaxed text-gray-700">
              Select a node in the species tree to retrieve the set of protein-coding genes inferred
              to have been present in that common ancestor.
            </p>
          </div>
          <div>
            <h3 className="mb-2 text-lg font-medium">
              Compare a modern genome with its ancestral genomes
            </h3>
            <p className="text-sm leading-relaxed text-gray-700">
              From the nested species list view, or the upper right corner of the corresponding gene
              list table, open the information panel for an extant species to select an ancestral
              genome for comparison.
            </p>
          </div>
        </div>
        <img
          className="w-full rounded border border-gray-200"
          src="assets/images/home/treeview.png"
          alt="Screenshot of the nested species list view"
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button component={Link} to={`/species/${ROOT_SPECIES}`} size="md" color="green">
          Browse via nested species list view
        </Button>
        <Button component={Link} to="/species/expandable" size="md" variant="default">
          Expandable species tree view
        </Button>
      </div>
    </section>
  </div>
)

export default HomePage
