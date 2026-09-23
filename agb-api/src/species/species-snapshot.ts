import { Species, SpeciesTreeNode, Stats } from './models/species.model';
import { SpeciesDoc } from './schemas/species.schema';
import { SpeciesBase, toSpeciesBase } from './species.mapper';

export interface SpeciesDiagnostics {
  total: number;
  /** Nodes whose stored parent does not exist, and where the tree puts them. */
  orphans: Array<{
    id: string;
    shortName: string;
    missingParentId: string;
    placedUnder: string | null;
  }>;
  /** Nodes that cannot be reached from a root by following parent_id. */
  unreachable: string[];
  /** Internal nodes whose timescale says "extant". */
  internalWithZeroTimescale: string[];
  unknownTimescale: string[];
  olderThanParent: Array<{
    shortName: string;
    timescale: number;
    parentShortName: string;
    parentTimescale: number;
  }>;
  /** Names used in all_ancestors that have no species row. */
  missingAncestorNames: Array<{ name: string; referencedBy: number }>;
}

/**
 * The whole species tree held in memory (255 rows), with everything derived
 * from its shape. Built once per load by `SpeciesIndex`; immutable after that.
 */
export class SpeciesSnapshot {
  readonly list: Species[];
  private readonly byIdMap = new Map<string, Species>();
  private readonly byShort = new Map<string, Species>();
  private readonly byLong = new Map<string, Species>();
  /** `null` marks a case-insensitive key shared by two species. */
  private readonly byShortLower = new Map<string, Species | null>();
  private readonly byLongLower = new Map<string, Species | null>();
  private readonly childrenOf = new Map<string, Species[]>();

  static fromDocuments(docs: SpeciesDoc[]): SpeciesSnapshot {
    return new SpeciesSnapshot(
      docs
        .map(toSpeciesBase)
        .filter((base): base is SpeciesBase => base !== null),
    );
  }

  constructor(bases: SpeciesBase[]) {
    const unique = new Map<string, SpeciesBase>();
    for (const base of [...bases].sort(compareByName)) {
      if (!unique.has(base.id)) {
        unique.set(base.id, base);
      }
    }

    const baseByShort = new Map<string, SpeciesBase>();
    for (const base of unique.values()) {
      setOnce(baseByShort, base.shortName, base);
    }

    // Repair the tree first: a node whose stored parent is missing hangs under
    // its deepest existing ancestor. Everything shape-derived (isExtant,
    // children) then follows the repaired tree — by stored parent_id alone,
    // rosids would look like a leaf, because its only child (malvids) points
    // at the missing eurosids node.
    const placed = [...unique.values()].map((base) => {
      const orphaned = base.parentId !== null && !unique.has(base.parentId);
      const treeParentId = orphaned
        ? (deepestExistingAncestor(base, baseByShort)?.id ?? null)
        : base.parentId;
      return { base, treeParentId, orphaned };
    });
    const hasChildren = new Set(
      placed.map(({ treeParentId }) => treeParentId).filter(Boolean),
    );

    this.list = placed.map(({ base, treeParentId, orphaned }) => ({
      ...base,
      isExtant: !hasChildren.has(base.id),
      treeParentId,
      placementInferred: orphaned,
    }));

    for (const species of this.list) {
      this.byIdMap.set(species.id, species);
      setOnce(this.byShort, species.shortName, species);
      setOnce(this.byLong, species.longName, species);
      setUnique(this.byShortLower, species.shortName.toLowerCase(), species);
      setUnique(this.byLongLower, species.longName.toLowerCase(), species);
      if (species.treeParentId !== null) {
        const siblings = this.childrenOf.get(species.treeParentId) ?? [];
        siblings.push(species);
        this.childrenOf.set(species.treeParentId, siblings);
      }
    }
  }

  /** By short or long name: exact first, then case-insensitive if unambiguous. */
  resolve(name: string): Species | undefined {
    const key = name.trim();
    return (
      this.byShort.get(key) ??
      this.byLong.get(key) ??
      this.byShortLower.get(key.toLowerCase()) ??
      this.byLongLower.get(key.toLowerCase()) ??
      undefined
    );
  }

  /** Exact short name only — how `all_ancestors` and gene rows name species. */
  byShortName(shortName: string): Species | undefined {
    return this.byShort.get(shortName);
  }

  byId(id: string): Species | undefined {
    return this.byIdMap.get(id);
  }

  /** Children in the repaired tree (by `treeParentId`). */
  children(id: string): Species[] {
    return this.childrenOf.get(id) ?? [];
  }

  /**
   * Nested by `treeParentId`, so subtrees under a missing node still appear
   * (under their deepest existing ancestor). A cycle in the data would make
   * the tree infinite; a node that would close one is returned as a root.
   */
  tree(): SpeciesTreeNode[] {
    const nodes = new Map<string, SpeciesTreeNode>(
      this.list.map((species) => [species.id, { ...species, children: [] }]),
    );
    const roots: SpeciesTreeNode[] = [];
    for (const species of this.list) {
      const node = nodes.get(species.id)!;
      const parent =
        species.treeParentId === null
          ? undefined
          : nodes.get(species.treeParentId);
      if (parent && !this.isAncestorInTree(species.id, parent.id)) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  stats(pantherVersion: string | null): Stats {
    const ancestral = this.list.filter((species) => !species.isExtant);
    const extant = this.list.filter((species) => species.isExtant);
    const genes = (group: Species[]) =>
      group.reduce((total, species) => total + species.geneCount, 0);
    return {
      pantherVersion,
      species: {
        ancestral: ancestral.length,
        extant: extant.length,
        total: this.list.length,
      },
      genes: {
        ancestral: genes(ancestral),
        extant: genes(extant),
        total: genes(this.list),
      },
    };
  }

  diagnostics(): SpeciesDiagnostics {
    // Reachability by the stored parent_id, i.e. as a naive client sees it.
    const storedChildren = new Map<string, Species[]>();
    for (const species of this.list) {
      if (species.parentId !== null) {
        const siblings = storedChildren.get(species.parentId) ?? [];
        siblings.push(species);
        storedChildren.set(species.parentId, siblings);
      }
    }
    const reachable = new Set<string>();
    const visit = (id: string) => {
      for (const child of storedChildren.get(id) ?? []) {
        if (!reachable.has(child.id)) {
          reachable.add(child.id);
          visit(child.id);
        }
      }
    };
    for (const root of this.list.filter((s) => s.parentId === null)) {
      reachable.add(root.id);
      visit(root.id);
    }

    const referenced = new Map<string, number>();
    for (const species of this.list) {
      for (const ancestor of species.ancestors) {
        if (!this.byShort.has(ancestor.shortName)) {
          referenced.set(
            ancestor.shortName,
            (referenced.get(ancestor.shortName) ?? 0) + 1,
          );
        }
      }
    }

    return {
      total: this.list.length,
      orphans: this.list
        .filter((species) => species.placementInferred)
        .map((species) => ({
          id: species.id,
          shortName: species.shortName,
          missingParentId: species.parentId!,
          placedUnder:
            species.treeParentId === null
              ? null
              : (this.byId(species.treeParentId)?.shortName ?? null),
        })),
      unreachable: this.list
        .filter((species) => !reachable.has(species.id))
        .map((species) => species.shortName),
      internalWithZeroTimescale: this.list
        .filter((species) => !species.isExtant && species.timescale === 0)
        .map((species) => species.shortName),
      unknownTimescale: this.list
        .filter((species) => species.timescale === null)
        .map((species) => species.shortName),
      olderThanParent: this.list.flatMap((species) => {
        const parent =
          species.parentId === null ? undefined : this.byId(species.parentId);
        return parent &&
          species.timescale !== null &&
          parent.timescale !== null &&
          species.timescale > parent.timescale
          ? [
              {
                shortName: species.shortName,
                timescale: species.timescale,
                parentShortName: parent.shortName,
                parentTimescale: parent.timescale,
              },
            ]
          : [];
      }),
      missingAncestorNames: [...referenced.entries()]
        .map(([name, referencedBy]) => ({ name, referencedBy }))
        .sort((a, b) => b.referencedBy - a.referencedBy),
    };
  }

  /** Whether `candidateId` is `id` or one of its tree ancestors. */
  private isAncestorInTree(id: string, candidateId: string): boolean {
    let current: string | null = candidateId;
    for (
      let steps = 0;
      current !== null && steps <= this.list.length;
      steps++
    ) {
      if (current === id) {
        return true;
      }
      current = this.byIdMap.get(current)?.treeParentId ?? null;
    }
    return false;
  }
}

/**
 * The ancestor to hang an orphan under: of the names in its `all_ancestors`
 * that exist, the one with the longest lineage of its own. `all_ancestors` is
 * ordered by age, and the ages are unreliable (blank for the missing nodes,
 * Brassicaceae older than its parent), so depth is used instead.
 */
function deepestExistingAncestor(
  base: SpeciesBase,
  byShort: Map<string, SpeciesBase>,
): SpeciesBase | undefined {
  let best: SpeciesBase | undefined;
  for (const ancestor of base.ancestors) {
    const candidate = byShort.get(ancestor.shortName);
    if (
      candidate &&
      candidate.id !== base.id &&
      (!best || candidate.ancestors.length > best.ancestors.length)
    ) {
      best = candidate;
    }
  }
  return best;
}

/** Alphabetical regardless of case, as the legacy list reads. */
function compareByName(a: SpeciesBase, b: SpeciesBase): number {
  const left = a.shortName.toLowerCase();
  const right = b.shortName.toLowerCase();
  if (left !== right) {
    return left < right ? -1 : 1;
  }
  return a.shortName < b.shortName ? -1 : a.shortName > b.shortName ? 1 : 0;
}

function setOnce<K, V>(map: Map<K, V>, key: K, value: V) {
  if (!map.has(key)) {
    map.set(key, value);
  }
}

function setUnique<K, V>(map: Map<K, V | null>, key: K, value: V) {
  if (!map.has(key)) {
    map.set(key, value);
  } else if (map.get(key) !== value) {
    map.set(key, null);
  }
}
