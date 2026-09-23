import request from 'supertest';
import { createTestApp, TestApp } from './utils/test-app';

describe('GraphQL', () => {
  let t: TestApp;

  const gql = (query: string, variables?: Record<string, unknown>) =>
    request(t.http).post('/graphql').send({ query, variables });

  beforeAll(async () => {
    t = await createTestApp('agb_test_graphql', {
      GRAPHQL_MAX_COMPLEXITY: '5000',
    });
  });

  afterAll(async () => {
    await t.close();
  });

  it('resolves a species with its parent, children and ancestors', async () => {
    const res = await gql(`{
      species(name: "Homo-Pan") {
        shortName isExtant
        parent { shortName }
        children { shortName }
        ancestors { shortName timescale species { id } }
      }
    }`).expect(200);

    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.species).toEqual({
      shortName: 'Homo-Pan',
      isExtant: false,
      parent: { shortName: 'Eukaryota' },
      children: [{ shortName: 'HUMAN' }, { shortName: 'PANTR' }],
      ancestors: [
        { shortName: 'Eukaryota', timescale: 2101, species: { id: '2' } },
        { shortName: 'LUCA', timescale: 4290, species: { id: '1' } },
      ],
    });
  });

  it('follows the repaired tree and reports missing ancestors as null', async () => {
    const res = await gql(`{
      species(name: "malvids") {
        parentId treeParentId placementInferred
        parent { shortName }
        ancestors { shortName species { shortName } }
      }
    }`).expect(200);

    const malvids = res.body.data.species;
    expect(malvids).toMatchObject({
      parentId: '254',
      placementInferred: true,
      parent: { shortName: 'rosids' },
    });
    expect(malvids.ancestors[0]).toEqual({
      shortName: 'eurosids',
      species: null,
    });
  });

  it('returns null for an unknown species or gene', async () => {
    const res = await gql(
      '{ species(name: "NOPE") { id } gene(ptn: "PTN999999999") { ptn } }',
    );
    expect(res.body.data).toEqual({ species: null, gene: null });
  });

  it('pages a species genome and lists its proxy species', async () => {
    const res = await gql(`{
      species(name: "LUCA") {
        genes(offset: 1, limit: 2) { total offset limit items { ptn proxyGene } }
        proxySpecies { shortName }
        unmodelledGenes { total }
      }
    }`).expect(200);

    expect(res.body.data.species).toEqual({
      genes: {
        total: 4,
        offset: 1,
        limit: 2,
        items: [
          {
            ptn: 'PTN000000526',
            proxyGene: 'HUMAN|HGNC=11019|UniProtKB=Q06495',
          },
          {
            ptn: 'PTN000003242',
            proxyGene: 'ARATH|TAIR=AT2G00002|UniProtKB=Q00002',
          },
        ],
      },
      proxySpecies: [{ shortName: 'ARATH' }, { shortName: 'HUMAN' }],
      unmodelledGenes: null,
    });
  });

  it('passes the proxy argument through (it once was stripped by the ValidationPipe)', async () => {
    const res = await gql(`{
      species(name: "LUCA") { genes(proxy: "Homo sapiens", limit: 4) { items { ptn proxyGene } } }
    }`).expect(200);

    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.species.genes.items).toEqual([
      { ptn: 'PTN000000084', proxyGene: null },
      { ptn: 'PTN000000526', proxyGene: 'HUMAN|HGNC=11019|UniProtKB=Q06495' },
      { ptn: 'PTN000003242', proxyGene: null },
      { ptn: 'PTN000004000', proxyGene: null },
    ]);
  });

  it('keeps the gene when only its annotations fail', async () => {
    const res = await gql(`{
      gene(ptn: "PTN000000526") {
        ptn sequence
        species { longName }
        proxyGenes { gene species { shortName } }
        paintAnnotations { goId }
      }
    }`).expect(200);

    expect(res.body.data.gene).toMatchObject({
      ptn: 'PTN000000526',
      sequence: 'MKVLLGAE',
      species: { longName: 'LUCA' },
      paintAnnotations: null,
    });
    expect(res.body.data.gene.proxyGenes[0].species.shortName).toBe('HUMAN');
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].path).toEqual(['gene', 'paintAnnotations']);
    expect(res.body.errors[0].message).toMatch(/not available/);
  });

  it('compares genomes, with the corrected gene gain', async () => {
    const res = await gql(`{
      comparison(ancestral: "rosids", extant: "ARATH") {
        ancestral { shortName } extant { shortName }
        counts { inherited descendants lost gained unmodelled }
        gained { items { ptn } }
        inherited { items { ptn descendants { ptn } } }
      }
    }`).expect(200);

    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.comparison).toEqual({
      ancestral: { shortName: 'rosids' },
      extant: { shortName: 'ARATH' },
      counts: {
        inherited: 1,
        descendants: 1,
        lost: 0,
        gained: 2,
        unmodelled: 0,
      },
      gained: { items: [{ ptn: 'PTN007000002' }, { ptn: 'PTN007000003' }] },
      inherited: {
        items: [
          { ptn: 'PTN005000001', descendants: [{ ptn: 'PTN007000001' }] },
        ],
      },
    });
  });

  it('returns null for an unknown pair and an error for an invalid one', async () => {
    const unknown = await gql(
      '{ comparison(ancestral: "NOPE", extant: "HUMAN") { counts { gained } } }',
    );
    expect(unknown.body.data.comparison).toBeNull();
    expect(unknown.body.errors).toBeUndefined();

    const invalid = await gql(
      '{ comparison(ancestral: "rosids", extant: "HUMAN") { counts { gained } } }',
    );
    expect(invalid.body.data.comparison).toBeNull();
    expect(invalid.body.errors[0].message).toMatch(/not an ancestor/);
  });

  it('reports stats', async () => {
    const res = await gql(
      '{ stats { species { ancestral extant } genes { total } } }',
    );
    expect(res.body.data.stats).toEqual({
      species: { ancestral: 7, extant: 5 },
      genes: { total: 29 },
    });
  });

  describe('limits', () => {
    it('rejects queries deeper than GRAPHQL_MAX_DEPTH', async () => {
      const res = await gql(
        '{ speciesList { children { children { children { children { children { children { children { shortName } } } } } } } } }',
      ).expect(400);
      expect(res.body.errors[0].message).toBe(
        'Query depth 9 exceeds the maximum of 8.',
      );
    });

    it('rejects queries over the complexity budget before resolving anything', async () => {
      const res = await gql(
        '{ species(name: "LUCA") { genes(limit: 10000) { items { ptn name familyId } } } }',
      ).expect(400);
      expect(res.body.errors[0].message).toMatch(
        /complexity \d+ exceeds the maximum of 5000/,
      );
      expect(res.body.errors[0].extensions.code).toBe('QUERY_TOO_COMPLEX');
      expect(res.body.data).toBeUndefined();
    });

    it('still serves introspection', async () => {
      const res = await gql('{ __schema { queryType { name } } }').expect(200);
      expect(res.body.data.__schema.queryType.name).toBe('Query');
    });
  });
});

describe('GraphQL page cap (default complexity budget)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp('agb_test_graphql_cap');
  });

  afterAll(async () => {
    await t.close();
  });

  it('caps page sizes, pointing bulk requests at REST', async () => {
    const res = await request(t.http).post('/graphql').send({
      query: '{ species(name: "LUCA") { genes(limit: 20000) { total } } }',
    });
    expect(res.body.errors[0].message).toMatch(
      /limit must be between 1 and 10000/,
    );
    expect(res.body.errors[0].path).toEqual(['species', 'genes']);
  });
});
