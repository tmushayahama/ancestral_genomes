import { cleanSequence, orNull } from '../common/text';
import {
  AnnotationInheritance,
  Gene,
  GeneSummary,
  PaintAnnotation,
  ProxyGene,
} from './models/gene.model';
import { GeneDoc, PaintAnnotationDoc } from './schemas/gene.schema';

/** The fields a list row carries, whichever collection it came from. */
export interface GeneRowDoc {
  ptn: string;
  name?: string;
  pthr?: string;
  proxy_gene?: string;
}

export const GENE_ROW_PROJECTION = {
  _id: 0,
  ptn: 1,
  name: 1,
  pthr: 1,
  proxy_gene: 1,
} as const;

/**
 * `proxy_gene` means the gene itself in an extant species' list and its
 * stand-in in an ancestral one, so the row's kind decides which field it fills.
 */
export function toGeneSummary(
  row: GeneRowDoc,
  kind: 'extant' | 'ancestral',
): GeneSummary {
  const gene = orNull(row.proxy_gene);
  return {
    ptn: row.ptn,
    name: orNull(row.name),
    familyId: orNull(row.pthr),
    pantherId: kind === 'extant' ? gene : null,
    proxyGene: kind === 'ancestral' ? gene : null,
  };
}

/**
 * @param isExtant whether the gene's species is a leaf of the tree, when the
 *   species is known; otherwise a gene with proxies counts as ancestral.
 */
export function toGene(doc: GeneDoc, isExtant: boolean | undefined): Gene {
  const proxyGenes = (Array.isArray(doc.proxy_genes) ? doc.proxy_genes : [])
    .map((proxy): ProxyGene | null => {
      const gene = orNull(proxy?.proxy_gene);
      const speciesShortName = orNull(proxy?.proxy_spe_short);
      return gene && speciesShortName
        ? {
            speciesShortName,
            speciesLongName: orNull(proxy.proxy_spe_long),
            gene,
          }
        : null;
    })
    .filter((proxy): proxy is ProxyGene => proxy !== null);

  return {
    ptn: doc.ptn,
    name: orNull(doc.name),
    speciesShortName: orNull(doc.species_short) ?? '',
    speciesLongName: orNull(doc.species_long),
    event: orNull(doc.event),
    familyId: orNull(doc.pthr),
    familyName: orNull(doc.family_name),
    sequence: cleanSequence(doc.sequence),
    alignedSequence: orNull(doc.sequence),
    pantherId: orNull(doc.longId),
    isAncestral: isExtant === undefined ? proxyGenes.length > 0 : !isExtant,
    proxyGenes,
  };
}

/**
 * Direct and inherited PAINT annotations stored on a gene. As in the legacy
 * scrape, negated terms ("(NOT) …") are left out and duplicates dropped.
 */
export function toPaintAnnotations(doc: Partial<GeneDoc>): PaintAnnotation[] {
  const sources: Array<
    [PaintAnnotationDoc[] | undefined, AnnotationInheritance | null]
  > = [
    [doc.direct_paint_annotations, AnnotationInheritance.DIRECT],
    [doc.inherited_paint_annotations, AnnotationInheritance.INHERITED],
    [doc.paint_annotations, null],
  ];
  const seen = new Set<string>();
  const annotations: PaintAnnotation[] = [];
  for (const [entries, inheritance] of sources) {
    for (const entry of Array.isArray(entries) ? entries : []) {
      const goId = orNull(entry?.go_accession);
      const goName = orNull(entry?.go_name);
      if (!goId || !goName || goName.includes('(NOT)')) {
        continue;
      }
      const key = `${goId}:${inheritance}`;
      if (!seen.has(key)) {
        seen.add(key);
        annotations.push({ goId, goName, inheritance });
      }
    }
  }
  return annotations;
}
