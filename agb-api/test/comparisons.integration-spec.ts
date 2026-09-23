import request from 'supertest';
import { createTestApp, TestApp } from './utils/test-app';

const ptns = (body: { items: Array<{ ptn: string }> }) =>
  body.items.map((item) => item.ptn);

describe('Genome comparisons (REST)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp('agb_test_comparisons');
  });

  afterAll(async () => {
    await t.close();
  });

  it('summarises a pair with its counts', async () => {
    const res = await request(t.http)
      .get('/api/comparisons/Homo-Pan/HUMAN')
      .expect(200);

    expect(res.body.ancestral.shortName).toBe('Homo-Pan');
    expect(res.body.extant.shortName).toBe('HUMAN');
    expect(res.body.counts).toEqual({
      inherited: 2,
      descendants: 3,
      lost: 1,
      gained: 1,
      unmodelled: 1,
    });
  });

  it('accepts either name for either side', async () => {
    const res = await request(t.http)
      .get('/api/comparisons/homo-pan/Homo%20sapiens')
      .expect(200);
    expect(res.body.counts.inherited).toBe(2);
  });

  it('lists inherited genes with their descendants zipped', async () => {
    const res = await request(t.http)
      .get('/api/comparisons/Homo-Pan/HUMAN/inherited')
      .expect(200);

    expect(res.body.total).toBe(2);
    expect(res.body.items[1]).toEqual({
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

  it('lists lost genes', async () => {
    const res = await request(t.http)
      .get('/api/comparisons/Homo-Pan/HUMAN/lost')
      .expect(200);
    expect(res.body.items).toEqual([
      {
        ptn: 'PTN900000717',
        name: null,
        familyId: 'PTHR10030',
        pantherId: null,
        proxyGene: null,
      },
    ]);
  });

  it('lists gained genes, leaving out unmodelled ones', async () => {
    const res = await request(t.http)
      .get('/api/comparisons/Homo-Pan/HUMAN/gained')
      .expect(200);
    expect(ptns(res.body)).toEqual(['PTN002542101']);
    expect(res.body.items[0].pantherId).toBe(
      'HUMAN|HGNC=1144|UniProtKB=Q9Y297',
    );
  });

  describe('gene gain matches ancestor names exactly (legacy bug F3)', () => {
    it('counts a gene that arose at eurosids as gained since rosids', async () => {
      const res = await request(t.http)
        .get('/api/comparisons/rosids/ARATH/gained')
        .expect(200);
      // The legacy filter, new RegExp('rosids'), also matched "eurosids" and
      // returned only PTN007000003.
      expect(ptns(res.body)).toEqual(['PTN007000002', 'PTN007000003']);
    });

    it('still excludes it since malvids, which it passed through', async () => {
      const res = await request(t.http)
        .get('/api/comparisons/malvids/ARATH/gained')
        .expect(200);
      expect(ptns(res.body)).toEqual(['PTN007000003']);
    });

    it('agrees with the summary count', async () => {
      const res = await request(t.http)
        .get('/api/comparisons/rosids/ARATH')
        .expect(200);
      expect(res.body.counts.gained).toBe(2);
    });
  });

  it('pages the lists', async () => {
    const res = await request(t.http)
      .get('/api/comparisons/Homo-Pan/HUMAN/inherited?offset=1&limit=1')
      .expect(200);
    expect(res.body).toMatchObject({ total: 2, offset: 1, limit: 1 });
    expect(ptns(res.body)).toEqual(['PTN004119341']);
  });

  it.each([
    [
      'the extant side is ancestral',
      '/api/comparisons/LUCA/Homo-Pan',
      /not an extant/,
    ],
    [
      'the ancestral side is not an ancestor',
      '/api/comparisons/rosids/HUMAN',
      /not an ancestor/,
    ],
    [
      'the sides are swapped',
      '/api/comparisons/HUMAN/Homo-Pan',
      /not an extant/,
    ],
  ])('answers 400 when %s', async (_label, path, message) => {
    const res = await request(t.http).get(path).expect(400);
    expect(res.body.message).toMatch(message);
  });

  it('answers 404 for an unknown species', async () => {
    await request(t.http).get('/api/comparisons/NOPE/HUMAN/gained').expect(404);
  });
});
