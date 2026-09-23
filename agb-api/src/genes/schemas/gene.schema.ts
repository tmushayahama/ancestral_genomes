import { Schema } from 'mongoose';

export const GENE_MODEL = 'Gene';

export interface ProxyGeneDoc {
  proxy_spe_short?: string;
  proxy_spe_long?: string;
  proxy_gene?: string;
}

export interface PaintAnnotationDoc {
  go_accession?: string;
  go_name?: string;
}

/** A raw `genelists` document: one per gene, ancestral or extant. */
export interface GeneDoc {
  ptn: string;
  name?: string;
  species_short?: string;
  species_long?: string;
  event?: string;
  /** The reconstructed sequence with alignment padding. */
  sequence?: string;
  pthr?: string;
  family_name?: string;
  /** PANTHER long id; `NOT_AVAILABE` (sic) for ancestral genes. */
  longId?: string;
  proxy_genes?: ProxyGeneDoc[];
  paint_annotations?: PaintAnnotationDoc[];
  direct_paint_annotations?: PaintAnnotationDoc[];
  inherited_paint_annotations?: PaintAnnotationDoc[];
}

export const GeneSchema = new Schema<GeneDoc>(
  {
    ptn: String,
    name: String,
    species_short: String,
    species_long: String,
    event: String,
    sequence: String,
    pthr: String,
    family_name: String,
    longId: String,
    proxy_genes: Schema.Types.Mixed,
    paint_annotations: Schema.Types.Mixed,
    direct_paint_annotations: Schema.Types.Mixed,
    inherited_paint_annotations: Schema.Types.Mixed,
  },
  {
    collection: 'genelists',
    versionKey: false,
    autoIndex: false,
    strictQuery: 'throw',
    id: false,
  },
);

GeneSchema.index({ ptn: 1 });

export const GENE_PROJECTION = {
  _id: 0,
  ptn: 1,
  name: 1,
  species_short: 1,
  species_long: 1,
  event: 1,
  sequence: 1,
  pthr: 1,
  family_name: 1,
  longId: 1,
  proxy_genes: 1,
} as const;

export const ANNOTATION_PROJECTION = {
  _id: 0,
  paint_annotations: 1,
  direct_paint_annotations: 1,
  inherited_paint_annotations: 1,
} as const;
