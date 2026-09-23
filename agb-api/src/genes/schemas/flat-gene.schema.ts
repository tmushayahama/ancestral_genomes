import { Schema } from 'mongoose';

export const FLAT_GENE_MODEL = 'FlatGene';

/**
 * A raw `flat_genelists` row: an ancestral gene paired with one extant
 * descendant species, holding its descendant genes there (comma-joined, or
 * `NOT_AVAILABLE` when the gene was lost). Extant species also have rows here
 * for their genes that no family models (`pthr: NOT_AVAILABLE`).
 */
export interface FlatGeneDoc {
  ptn: string;
  name?: string;
  pthr?: string;
  event?: string;
  species_short: string;
  species_long?: string;
  descent_spe_short?: string;
  descent_spe_long?: string;
  proxy_gene?: string;
  descent_ptns?: string;
  descent_gnames?: string;
  descent_longIds?: string;
}

export const FlatGeneSchema = new Schema<FlatGeneDoc>(
  {
    ptn: String,
    name: String,
    pthr: String,
    event: String,
    species_short: String,
    species_long: String,
    descent_spe_short: String,
    descent_spe_long: String,
    proxy_gene: String,
    descent_ptns: String,
    descent_gnames: String,
    descent_longIds: String,
  },
  {
    collection: 'flat_genelists',
    versionKey: false,
    autoIndex: false,
    strictQuery: 'throw',
    id: false,
  },
);

/**
 * Proxy gene lists, inherited and lost genes, and proxy species (a distinct
 * scan over the first two keys). Unmodelled genes use the `species_short`
 * prefix.
 */
FlatGeneSchema.index({ species_short: 1, descent_spe_short: 1, ptn: 1 });
