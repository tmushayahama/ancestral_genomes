import request from 'supertest';
import { createTestApp, TestApp } from './utils/test-app';

const ptns = (body: { items: Array<{ ptn: string }> }) =>
  body.items.map((item) => item.ptn);

describe('Genes (REST)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp('agb_test_genes');
  });

  afterAll(async () => {
    await t.close();
  });

  describe('GET /api/genes/:ptn', () => {
    it('returns an ancestral gene, cleaned', async () => {
      const res = await request(t.http)
        .get('/api/genes/PTN000000526')
        .expect(200);

      expect(res.body).toEqual({
        ptn: 'PTN000000526',
        name: 'SODIUM-DEPENDENT PHOSPHATE TRANSPORT PROTEIN 2C-RELATED',
        speciesShortName: 'LUCA',
        speciesLongName: 'LUCA',
        event: 'SPECIATION',
        familyId: 'PTHR10010',
        familyName: 'SOLUTE CARRIER FAMILY 34',
        sequence: 'MKVLLGAE',
        alignedSequence: 'mkv..llg--ae_',
        pantherId: null,
        isAncestral: true,
        proxyGenes: [
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
        ],
      });
    });

    it('returns an extant gene with its PANTHER id', async () => {
      const res = await request(t.http)
        .get('/api/genes/PTN002467165')
        .expect(200);
      expect(res.body).toMatchObject({
        isAncestral: false,
        pantherId: 'HUMAN|HGNC=11019|UniProtKB=Q06495',
        event: null,
      });
    });

    it('answers 404 for an unknown gene', async () => {
      await request(t.http).get('/api/genes/PTN999999999').expect(404);
    });
  });

  describe('GET /api/genes/:ptn/annotations', () => {
    it('answers 503, not a crash, when no source is configured', async () => {
      const res = await request(t.http)
        .get('/api/genes/PTN000000526/annotations')
        .expect(503);
      expect(res.body.message).toMatch(/not available/);

      // The process is still serving.
      await request(t.http).get('/api/genes/PTN000000526').expect(200);
    });
  });

  describe('GET /api/species/:name/genes', () => {
    it("lists an ancestral genome with each gene's default proxy, sorted by ptn", async () => {
      const res = await request(t.http)
        .get('/api/species/LUCA/genes')
        .expect(200);

      expect(res.body).toMatchObject({ total: 4, offset: 0, limit: null });
      expect(ptns(res.body)).toEqual([
        'PTN000000084',
        'PTN000000526',
        'PTN000003242',
        'PTN000004000',
      ]);
      expect(res.body.items[1]).toEqual({
        ptn: 'PTN000000526',
        name: 'SODIUM-DEPENDENT PHOSPHATE TRANSPORT PROTEIN 2C-RELATED',
        familyId: 'PTHR10010',
        pantherId: null,
        proxyGene: 'HUMAN|HGNC=11019|UniProtKB=Q06495',
      });
      expect(res.body.items[3]).toMatchObject({ name: null, proxyGene: null });
    });

    it.each(['Homo%20sapiens', 'HUMAN', 'human'])(
      'shows descendants in the proxy species %s',
      async (proxy) => {
        const res = await request(t.http)
          .get(`/api/species/LUCA/genes?proxy=${proxy}`)
          .expect(200);

        expect(res.body.total).toBe(4);
        const byPtn = Object.fromEntries(
          res.body.items.map(
            (item: { ptn: string; proxyGene: string | null }) => [
              item.ptn,
              item.proxyGene,
            ],
          ),
        );
        expect(byPtn).toEqual({
          PTN000000084: null,
          PTN000000526: 'HUMAN|HGNC=11019|UniProtKB=Q06495',
          PTN000003242: null,
          PTN000004000: null,
        });
      },
    );

    it("lists an extant genome with each gene's own id", async () => {
      const res = await request(t.http)
        .get('/api/species/HUMAN/genes')
        .expect(200);

      expect(res.body.total).toBe(5);
      expect(res.body.items[0]).toEqual({
        ptn: 'PTN002467165',
        name: 'SODIUM-DEPENDENT PHOSPHATE TRANSPORT PROTEIN 2A',
        familyId: 'PTHR10010',
        pantherId: 'HUMAN|HGNC=11019|UniProtKB=Q06495',
        proxyGene: null,
      });
    });

    it('pages', async () => {
      const res = await request(t.http)
        .get('/api/species/LUCA/genes?offset=1&limit=2')
        .expect(200);
      expect(res.body).toMatchObject({ total: 4, offset: 1, limit: 2 });
      expect(ptns(res.body)).toEqual(['PTN000000526', 'PTN000003242']);
    });

    it.each(['limit=0', 'offset=-1', 'limit=abc', 'limit=2000000'])(
      'rejects ?%s',
      async (query) => {
        await request(t.http)
          .get(`/api/species/LUCA/genes?${query}`)
          .expect(400);
      },
    );

    it.each([
      [
        'an extant species',
        '/api/species/HUMAN/genes?proxy=PANTR',
        /extant species/,
      ],
      [
        'an ancestral proxy',
        '/api/species/LUCA/genes?proxy=Eukaryota',
        /not an extant/,
      ],
      [
        'a non-descendant proxy',
        '/api/species/Homo-Pan/genes?proxy=ARATH',
        /does not descend/,
      ],
      ['an unknown proxy', '/api/species/LUCA/genes?proxy=NOPE', /not found/],
    ])('rejects a proxy for %s', async (_label, path, message) => {
      const res = await request(t.http).get(path).expect(400);
      expect(res.body.message).toMatch(message);
    });

    it('answers 404 for an unknown species', async () => {
      await request(t.http).get('/api/species/NOPE/genes').expect(404);
    });
  });

  describe('GET /api/species/:name/proxy-species', () => {
    it('lists the extant descendants that have proxy genes', async () => {
      const luca = await request(t.http)
        .get('/api/species/LUCA/proxy-species')
        .expect(200);
      expect(
        luca.body.items.map((s: { longName: string }) => s.longName),
      ).toEqual(['Arabidopsis thaliana', 'Homo sapiens']);

      const homoPan = await request(t.http)
        .get('/api/species/Homo-Pan/proxy-species')
        .expect(200);
      expect(
        homoPan.body.items.map((s: { shortName: string }) => s.shortName),
      ).toEqual(['HUMAN', 'PANTR']);
    });

    it('is empty for an extant species', async () => {
      const res = await request(t.http)
        .get('/api/species/HUMAN/proxy-species')
        .expect(200);
      expect(res.body).toMatchObject({ total: 0, items: [] });
    });
  });

  describe('GET /api/species/:name/unmodelled-genes', () => {
    it('lists extant genes no family models', async () => {
      const res = await request(t.http)
        .get('/api/species/HUMAN/unmodelled-genes')
        .expect(200);
      expect(res.body.items).toEqual([
        {
          ptn: 'PTN006873414',
          name: 'Putative uncharacterized protein LOC152225',
          familyId: null,
          pantherId: 'HUMAN|Gene=YC023_HUMAN|UniProtKB=Q0VG73',
          proxyGene: null,
        },
      ]);
    });

    it('rejects an ancestral genome', async () => {
      await request(t.http)
        .get('/api/species/LUCA/unmodelled-genes')
        .expect(400);
    });
  });
});

describe('Genes (REST) with PAINT_ANNOTATIONS_SOURCE=database', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp('agb_test_annotations', {
      PAINT_ANNOTATIONS_SOURCE: 'database',
    });
  });

  afterAll(async () => {
    await t.close();
  });

  it('reads direct and inherited annotations, without negated terms', async () => {
    const res = await request(t.http)
      .get('/api/genes/PTN000000538/annotations')
      .expect(200);
    expect(res.body).toEqual([
      {
        goId: 'GO:0005315',
        goName: 'inorganic phosphate transmembrane transporter activity',
        inheritance: 'direct',
      },
      {
        goId: 'GO:0006817',
        goName: 'phosphate ion transport',
        inheritance: 'inherited',
      },
    ]);
  });

  it('returns an empty list when a gene has none', async () => {
    const res = await request(t.http)
      .get('/api/genes/PTN000000526/annotations')
      .expect(200);
    expect(res.body).toEqual([]);
  });

  it('answers 404 for an unknown gene', async () => {
    await request(t.http)
      .get('/api/genes/PTN999999999/annotations')
      .expect(404);
  });
});
