import { Schema } from 'mongoose';

export const SPECIES_MODEL = 'Species';

/**
 * A raw `species` document. The legacy loader stored every numeric column as
 * text (`"6.65"`, `"20851"`) and the root's `parent_id` as `""`; the mapper
 * accepts text or numbers so a re-import with real types needs no code change.
 */
export interface SpeciesDoc {
  id: string | number;
  short_name: string;
  long_name?: string;
  taxon_id?: string | number | null;
  timescale?: string | number | null;
  gene_count?: string | number | null;
  parent_id?: string | number | null;
  parent_short_name?: string | null;
  /** `[millionsOfYearsAgo, shortName]`, ordered by age, not by lineage. */
  all_ancestors?: Array<[string | number | null, string]>;
}

export const SpeciesSchema = new Schema<SpeciesDoc>(
  {
    id: Schema.Types.Mixed,
    short_name: String,
    long_name: String,
    taxon_id: Schema.Types.Mixed,
    timescale: Schema.Types.Mixed,
    gene_count: Schema.Types.Mixed,
    parent_id: Schema.Types.Mixed,
    parent_short_name: String,
    all_ancestors: Schema.Types.Mixed,
  },
  {
    // Mongoose would otherwise pluralise and lowercase the model name.
    collection: 'species',
    versionKey: false,
    // Never build indexes on boot against production; `db:indexes` does it.
    autoIndex: false,
    // A filter on an undeclared path throws instead of being silently dropped.
    strictQuery: 'throw',
    // The documents have a real `id` field; keep Mongoose's virtual off it.
    id: false,
  },
);

/** The species collection is small (255 rows) and read whole into memory. */
export const SPECIES_PROJECTION = {
  _id: 0,
  id: 1,
  short_name: 1,
  long_name: 1,
  taxon_id: 1,
  timescale: 1,
  gene_count: 1,
  parent_id: 1,
  parent_short_name: 1,
  all_ancestors: 1,
} as const;
