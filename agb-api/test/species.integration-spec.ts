import request from 'supertest';
import { createTestApp, TestApp } from './utils/test-app';

describe('Species (REST)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp('agb_test_species');
  });

  afterAll(async () => {
    await t.close();
  });

  it('lists every species as a page, alphabetically', async () => {
    const res = await request(t.http).get('/api/species').expect(200);

    expect(res.body).toMatchObject({ total: 12, offset: 0, limit: null });
    expect(res.body.items).toHaveLength(12);
    expect(res.body.items[0].shortName).toBe('ARATH');
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.headers['cache-control']).toBe('public, max-age=3600');
  });

  it('returns typed values, not the stored strings', async () => {
    const res = await request(t.http).get('/api/species/HUMAN').expect(200);

    expect(res.body).toEqual({
      id: '4',
      shortName: 'HUMAN',
      longName: 'Homo sapiens',
      taxonId: 9606,
      timescale: 0,
      geneCount: 5,
      isExtant: true,
      parentId: '3',
      parentShortName: 'Homo-Pan',
      treeParentId: '3',
      placementInferred: false,
      ancestors: [
        { shortName: 'Homo-Pan', timescale: 6.65 },
        { shortName: 'Eukaryota', timescale: 2101 },
        { shortName: 'LUCA', timescale: 4290 },
      ],
    });
  });

  it.each([
    ['a long name with a space', '/api/species/Homo%20sapiens', 'HUMAN'],
    ['a lowercase name', '/api/species/human', 'HUMAN'],
    [
      'an encoded slash',
      '/api/species/SAR%2FHA_supergroup',
      'SAR/HA_supergroup',
    ],
    [
      'parentheses',
      '/api/species/Plasmodium%20falciparum%20(isolate%203D7)',
      'PLAF7',
    ],
  ])('resolves %s', async (_label, path, shortName) => {
    const res = await request(t.http).get(path).expect(200);
    expect(res.body.shortName).toBe(shortName);
  });

  it('maps the root and blank columns to null', async () => {
    const luca = await request(t.http).get('/api/species/LUCA').expect(200);
    expect(luca.body).toMatchObject({
      parentId: null,
      treeParentId: null,
      isExtant: false,
    });

    const sar = await request(t.http)
      .get('/api/species/SAR%2FHA_supergroup')
      .expect(200);
    expect(sar.body.taxonId).toBeNull();
  });

  it('classifies eudicotyledons as ancestral despite its timescale of 0', async () => {
    const res = await request(t.http)
      .get('/api/species/eudicotyledons')
      .expect(200);
    expect(res.body).toMatchObject({ timescale: 0, isExtant: false });
  });

  it('answers 404 with a JSON body for an unknown species', async () => {
    const res = await request(t.http).get('/api/species/NOPE').expect(404);
    expect(res.body).toEqual({
      statusCode: 404,
      error: 'Not Found',
      message: 'Species "NOPE" not found.',
    });
    expect(res.headers['cache-control']).toBeUndefined();
  });

  it('nests the tree and re-attaches the subtree under the missing eurosids node', async () => {
    const res = await request(t.http).get('/api/species/tree').expect(200);

    expect(
      res.body.map((root: { shortName: string }) => root.shortName),
    ).toEqual(['LUCA']);
    const eukaryota = res.body[0].children.find(
      (c: { shortName: string }) => c.shortName === 'Eukaryota',
    );
    const rosids = eukaryota.children.find(
      (c: { shortName: string }) => c.shortName === 'rosids',
    );
    const malvids = rosids.children[0];
    expect(malvids).toMatchObject({
      shortName: 'malvids',
      parentId: '254',
      treeParentId: rosids.id,
      placementInferred: true,
    });
    expect(malvids.children[0].shortName).toBe('ARATH');
  });

  it('reports release figures by tree shape', async () => {
    const res = await request(t.http).get('/api/stats').expect(200);
    expect(res.body).toEqual({
      pantherVersion: null,
      species: { ancestral: 7, extant: 5, total: 12 },
      genes: { ancestral: 16, extant: 13, total: 29 },
    });
  });

  it('compresses responses when the client accepts gzip', async () => {
    const res = await request(t.http)
      .get('/api/species')
      .set('Accept-Encoding', 'gzip')
      .expect(200);
    expect(res.headers['content-encoding']).toBe('gzip');
  });
});
