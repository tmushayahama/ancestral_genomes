import { toInheritedGene } from './comparison.service';

describe('toInheritedGene', () => {
  it('zips the comma-joined descendant columns', () => {
    expect(
      toInheritedGene({
        ptn: 'PTN004119341',
        name: 'HEAT SHOCK TRANSCRIPTION FACTOR X-LINKED MEMBER 4-RELATED',
        pthr: 'PTHR10015',
        descent_ptns: 'PTN002558327,PTN002558326',
        descent_gnames: 'HEAT SHOCK FACTOR X 3,HEAT SHOCK FACTOR X 4',
        descent_longIds:
          'HUMAN|Ensembl=ENSG00000283697,HUMAN|Ensembl=ENSG00000283463',
      }),
    ).toEqual({
      ptn: 'PTN004119341',
      name: 'HEAT SHOCK TRANSCRIPTION FACTOR X-LINKED MEMBER 4-RELATED',
      familyId: 'PTHR10015',
      descendants: [
        {
          ptn: 'PTN002558327',
          name: 'HEAT SHOCK FACTOR X 3',
          pantherId: 'HUMAN|Ensembl=ENSG00000283697',
        },
        {
          ptn: 'PTN002558326',
          name: 'HEAT SHOCK FACTOR X 4',
          pantherId: 'HUMAN|Ensembl=ENSG00000283463',
        },
      ],
    });
  });

  it('keeps the columns aligned when one entry is a sentinel', () => {
    const gene = toInheritedGene({
      ptn: 'P',
      descent_ptns: 'NOT_AVAILABLE,PTN2',
      descent_gnames: 'NOT NAMED,SECOND',
      descent_longIds: 'NOT_AVAILABLE,ID2',
    });
    expect(gene.descendants).toEqual([
      { ptn: 'PTN2', name: 'SECOND', pantherId: 'ID2' },
    ]);
  });

  it('tolerates missing columns', () => {
    expect(toInheritedGene({ ptn: 'P' }).descendants).toEqual([]);
  });
});
