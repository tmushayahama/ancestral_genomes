import { Schema } from 'mongoose';

export const SHORT_GENE_MODEL = 'ShortGene';

/**
 * A raw `short_genelists` row: one per gene of a species' genome. For an
 * ancestral species `proxy_gene` is the gene's default extant stand-in; for an
 * extant species it is the gene's own PANTHER long id.
 */
export interface ShortGeneDoc {
  ptn: string;
  name?: string;
  pthr?: string;
  proxy_gene?: string;
  species_short: string;
  species_long?: string;
  /**
   * The ancestral genomes this gene's lineage passes through. Stored as one
   * delimited string (the delimiter is not verified yet) or possibly an array;
   * the gene-gain filter handles both.
   */
  ancestor_species?: string | string[];
}

export const ShortGeneSchema = new Schema<ShortGeneDoc>(
  {
    ptn: String,
    name: String,
    pthr: String,
    proxy_gene: String,
    species_short: String,
    species_long: String,
    ancestor_species: Schema.Types.Mixed,
  },
  {
    collection: 'short_genelists',
    versionKey: false,
    autoIndex: false,
    strictQuery: 'throw',
    id: false,
  },
);

/** Species gene lists and gene gain, sorted by ptn. */
ShortGeneSchema.index({ species_short: 1, ptn: 1 });
