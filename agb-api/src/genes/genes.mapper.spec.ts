import { GENES } from '../../test/fixtures/seed';
import { toGene, toGeneSummary, toPaintAnnotations } from './genes.mapper';
import { AnnotationInheritance } from './models/gene.model';
import { GeneDoc } from './schemas/gene.schema';

const gene = (ptn: string) =>
  GENES.find((row) => row.ptn === ptn) as unknown as GeneDoc;

describe('toGene', () => {
  it('cleans the ancestral LUCA gene and drops its sentinel id', () => {
    const result = toGene(gene('PTN000000526'), false);

    expect(result).toMatchObject({
      ptn: 'PTN000000526',
      speciesShortName: 'LUCA',
      event: 'SPECIATION',
      familyId: 'PTHR10010',
      sequence: 'MKVLLGAE',
      alignedSequence: 'mkv..llg--ae_',
      pantherId: null,
      isAncestral: true,
    });
    expect(result.proxyGenes).toEqual([
      {
        speciesShortName: 'HUMAN',
        speciesLongName: 'Homo sapiens',
        gene: 'HUMAN|HGNC=11019|UniProtKB=Q06495',
      },
      {
        speciesShortName: 'ARATH',
        speciesLongName: 'Arabidopsis thaliana',
        gene: 'ARATH|TAIR=AT1G00001|UniProtKB=Q00001',
      },
    ]);
  });

  it('keeps the PANTHER id of an extant gene', () => {
    expect(toGene(gene('PTN002467165'), true)).toMatchObject({
      pantherId: 'HUMAN|HGNC=11019|UniProtKB=Q06495',
      isAncestral: false,
      event: null,
      proxyGenes: [],
    });
  });

  it('maps "NOT NAMED" to a null name', () => {
    expect(toGene(gene('PTN900000717'), false).name).toBeNull();
  });

  it('falls back to "has proxies" when the species is unknown', () => {
    expect(toGene(gene('PTN000000526'), undefined).isAncestral).toBe(true);
    expect(toGene(gene('PTN002467165'), undefined).isAncestral).toBe(false);
  });
});

describe('toGeneSummary', () => {
  const row = {
    ptn: 'PTN000004000',
    name: 'NOT NAMED',
    pthr: 'PTHR10099',
    proxy_gene: 'HUMAN|HGNC=1|UniProtKB=P1',
  };

  it('puts proxy_gene in proxyGene for ancestral rows', () => {
    expect(toGeneSummary(row, 'ancestral')).toEqual({
      ptn: 'PTN000004000',
      name: null,
      familyId: 'PTHR10099',
      pantherId: null,
      proxyGene: 'HUMAN|HGNC=1|UniProtKB=P1',
    });
  });

  it('puts proxy_gene in pantherId for extant rows', () => {
    expect(toGeneSummary(row, 'extant')).toMatchObject({
      pantherId: 'HUMAN|HGNC=1|UniProtKB=P1',
      proxyGene: null,
    });
  });

  it('maps NOT_AVAILABLE family and proxy to null', () => {
    expect(
      toGeneSummary(
        { ptn: 'P', pthr: 'NOT_AVAILABLE', proxy_gene: 'NOT_AVAILABLE' },
        'ancestral',
      ),
    ).toMatchObject({ familyId: null, proxyGene: null });
  });
});

describe('toPaintAnnotations', () => {
  it('labels direct and inherited terms and leaves out negations', () => {
    expect(toPaintAnnotations(gene('PTN000000538'))).toEqual([
      {
        goId: 'GO:0005315',
        goName: 'inorganic phosphate transmembrane transporter activity',
        inheritance: AnnotationInheritance.DIRECT,
      },
      {
        goId: 'GO:0006817',
        goName: 'phosphate ion transport',
        inheritance: AnnotationInheritance.INHERITED,
      },
    ]);
  });

  it('returns an empty list when nothing is stored', () => {
    expect(toPaintAnnotations(gene('PTN000000526'))).toEqual([]);
    expect(toPaintAnnotations({})).toEqual([]);
  });
});
