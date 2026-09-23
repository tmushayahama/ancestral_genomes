import { SPECIES } from '../../test/fixtures/seed';
import { SpeciesDoc } from './schemas/species.schema';
import { SpeciesSnapshot } from './species-snapshot';

const snapshot = () =>
  SpeciesSnapshot.fromDocuments(SPECIES as unknown as SpeciesDoc[]);

describe('SpeciesSnapshot', () => {
  describe('mapping', () => {
    it('turns stored text into typed values', () => {
      const human = snapshot().resolve('HUMAN')!;

      expect(human).toMatchObject({
        id: '4',
        shortName: 'HUMAN',
        longName: 'Homo sapiens',
        taxonId: 9606,
        timescale: 0,
        geneCount: 5,
        parentId: '3',
        parentShortName: 'Homo-Pan',
        isExtant: true,
      });
      expect(human.ancestors[0]).toEqual({
        shortName: 'Homo-Pan',
        timescale: 6.65,
      });
    });

    it('maps the root parent "" and an empty taxon_id to null', () => {
      const s = snapshot();
      expect(s.resolve('LUCA')!.parentId).toBeNull();
      expect(s.resolve('SAR/HA_supergroup')!.taxonId).toBeNull();
    });

    it('keeps a blank ancestor age as null', () => {
      const malvids = snapshot().resolve('malvids')!;
      expect(malvids.ancestors[0]).toEqual({
        shortName: 'eurosids',
        timescale: null,
      });
    });

    it('lists species alphabetically regardless of case', () => {
      const names = snapshot().list.map((species) => species.shortName);
      expect(names.slice(0, 4)).toEqual([
        'ARATH',
        'eudicotyledons',
        'Eukaryota',
        'Homo-Pan',
      ]);
    });
  });

  describe('isExtant', () => {
    it('comes from tree shape, not timescale', () => {
      const s = snapshot();
      expect(s.resolve('eudicotyledons')).toMatchObject({
        timescale: 0,
        isExtant: false,
      });
      expect(s.resolve('VITVI')!.isExtant).toBe(true);
      expect(s.resolve('LUCA')!.isExtant).toBe(false);
    });
  });

  describe('resolve', () => {
    it('finds by short name, long name, and case-insensitively', () => {
      const s = snapshot();
      expect(s.resolve('HUMAN')!.id).toBe('4');
      expect(s.resolve('Homo sapiens')!.id).toBe('4');
      expect(s.resolve('human')!.id).toBe('4');
      expect(s.resolve('  homo SAPIENS ')!.id).toBe('4');
      expect(s.resolve('Plasmodium falciparum (isolate 3D7)')!.id).toBe('12');
    });

    it('returns undefined for unknown names', () => {
      expect(snapshot().resolve('NOPE')).toBeUndefined();
    });

    it('refuses an ambiguous case-insensitive match', () => {
      const s = new SpeciesSnapshot([
        { ...base('1', 'Abc'), parentId: null },
        { ...base('2', 'ABC'), parentId: '1' },
      ]);
      expect(s.resolve('Abc')!.id).toBe('1');
      expect(s.resolve('ABC')!.id).toBe('2');
      expect(s.resolve('abc')).toBeUndefined();
    });
  });

  describe('orphans', () => {
    it('places a node whose parent is missing under its deepest existing ancestor', () => {
      const malvids = snapshot().resolve('malvids')!;
      const rosids = snapshot().resolve('rosids')!;

      expect(malvids).toMatchObject({
        parentId: '254',
        treeParentId: rosids.id,
        placementInferred: true,
      });
    });

    it('counts an ancestor whose only child is orphaned as ancestral', () => {
      const s = snapshot();
      // By stored parent_id rosids has no children: malvids points at the
      // missing eurosids node. In the repaired tree it is malvids' parent.
      expect(s.resolve('rosids')!.isExtant).toBe(false);
      expect(
        s.children(s.resolve('rosids')!.id).map((c) => c.shortName),
      ).toEqual(['malvids']);
    });

    it('leaves correctly parented nodes alone', () => {
      expect(snapshot().resolve('ARATH')).toMatchObject({
        parentId: '7',
        treeParentId: '7',
        placementInferred: false,
      });
    });

    it('keeps orphaned subtrees in the tree', () => {
      const [root, ...others] = snapshot().tree();
      expect(root.shortName).toBe('LUCA');
      expect(others).toEqual([]);

      const eukaryota = root.children.find((c) => c.shortName === 'Eukaryota')!;
      const rosids = eukaryota.children.find((c) => c.shortName === 'rosids')!;
      const malvids = rosids.children.find((c) => c.shortName === 'malvids')!;
      expect(malvids.children.map((c) => c.shortName)).toEqual(['ARATH']);
    });

    it('returns a node that would close a cycle as a root instead of looping', () => {
      const s = new SpeciesSnapshot([
        { ...base('1', 'A'), parentId: '2' },
        { ...base('2', 'B'), parentId: '1' },
      ]);
      const roots = s.tree();
      expect(roots.length).toBeGreaterThan(0);
      expect(JSON.stringify(roots)).toBeDefined();
    });
  });

  describe('stats', () => {
    it('counts species and genes by tree shape', () => {
      expect(snapshot().stats('15.0')).toEqual({
        pantherVersion: '15.0',
        species: { ancestral: 7, extant: 5, total: 12 },
        genes: { ancestral: 16, extant: 13, total: 29 },
      });
    });
  });

  describe('diagnostics', () => {
    it('reports the data problems the live data has', () => {
      const report = snapshot().diagnostics();

      expect(report.orphans).toEqual([
        {
          id: '7',
          shortName: 'malvids',
          missingParentId: '254',
          placedUnder: 'rosids',
        },
      ]);
      expect(report.unreachable.sort()).toEqual(['ARATH', 'malvids']);
      expect(report.internalWithZeroTimescale).toEqual(['eudicotyledons']);
      expect(report.missingAncestorNames).toEqual([
        { name: 'eurosids', referencedBy: 2 },
      ]);
    });

    it('flags a child older than its parent', () => {
      const s = new SpeciesSnapshot([
        { ...base('1', 'Old'), parentId: null, timescale: 10 },
        { ...base('2', 'Older'), parentId: '1', timescale: 20 },
      ]);
      expect(s.diagnostics().olderThanParent).toEqual([
        {
          shortName: 'Older',
          timescale: 20,
          parentShortName: 'Old',
          parentTimescale: 10,
        },
      ]);
    });
  });
});

function base(id: string, shortName: string) {
  return {
    id,
    shortName,
    longName: shortName,
    taxonId: null,
    timescale: null as number | null,
    geneCount: 0,
    parentId: null as string | null,
    parentShortName: null,
    ancestors: [],
  };
}
