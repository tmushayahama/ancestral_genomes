import { orNull, toInt, toNumber } from '../common/text';
import { Ancestor, Species } from './models/species.model';
import { SpeciesDoc } from './schemas/species.schema';

/** The stored fields of a species; the tree-derived ones come later. */
export type SpeciesBase = Omit<
  Species,
  'isExtant' | 'treeParentId' | 'placementInferred'
>;

/** `null` for a document without an id or a name — it cannot be addressed. */
export function toSpeciesBase(doc: SpeciesDoc): SpeciesBase | null {
  const id = orNull(doc.id);
  const shortName = orNull(doc.short_name);
  if (id === null || shortName === null) {
    return null;
  }
  return {
    id,
    shortName,
    longName: orNull(doc.long_name) ?? shortName,
    taxonId: toInt(doc.taxon_id),
    timescale: toNumber(doc.timescale),
    geneCount: toInt(doc.gene_count) ?? 0,
    // The root is stored with parent_id "", which orNull maps to null.
    parentId: orNull(doc.parent_id),
    parentShortName: orNull(doc.parent_short_name),
    ancestors: toAncestors(doc.all_ancestors),
  };
}

function toAncestors(raw: SpeciesDoc['all_ancestors']): Ancestor[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.flatMap((entry) => {
    if (!Array.isArray(entry)) {
      return [];
    }
    const shortName = orNull(entry[1]);
    return shortName === null
      ? []
      : [{ shortName, timescale: toNumber(entry[0]) }];
  });
}
