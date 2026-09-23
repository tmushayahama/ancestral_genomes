import request from 'supertest';
import { createTestApp, TestApp } from './utils/test-app';

describe('App', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp('agb_test_app');
  });

  afterAll(async () => {
    await t.close();
  });

  it('indexes its endpoints at /', async () => {
    const res = await request(t.http).get('/').expect(200);
    expect(res.body).toMatchObject({ docs: '/api/docs', graphql: '/graphql' });
  });

  it('reports health without caching', async () => {
    const res = await request(t.http).get('/api/health').expect(200);
    expect(res.body).toEqual({ status: 'ok', db: 'up' });
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('serves the OpenAPI document and Swagger UI', async () => {
    const json = await request(t.http).get('/api/docs-json').expect(200);
    expect(json.body.info.title).toBe('Ancestral Genomes API');
    expect(Object.keys(json.body.paths)).toEqual(
      expect.arrayContaining([
        '/api/species',
        '/api/species/{name}/genes',
        '/api/genes/{ptn}',
        '/api/comparisons/{ancestral}/{extant}/gained',
      ]),
    );
    await request(t.http)
      .get('/api/docs')
      .expect(200)
      .expect('content-type', /html/);
  });

  it('answers unknown routes with a JSON 404', async () => {
    const res = await request(t.http).get('/genelist/species-list').expect(404);
    expect(res.body.statusCode).toBe(404);
  });

  it('sets security and CORS headers and hides the framework', async () => {
    const res = await request(t.http)
      .get('/api/species/HUMAN')
      .set('Origin', 'https://example.org')
      .expect(200);
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['access-control-allow-origin']).toBe('*');
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
  });
});

describe('App throttling', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp('agb_test_throttle', { THROTTLE_LIMIT: '3' });
  });

  afterAll(async () => {
    await t.close();
  });

  // The throttler counts per route (REST handler or GraphQL root field).
  it('answers 429 past the limit on REST', async () => {
    for (let i = 0; i < 3; i++) {
      await request(t.http).get('/api/stats').expect(200);
    }
    await request(t.http).get('/api/stats').expect(429);
  });

  it('refuses the query past the limit on GraphQL', async () => {
    const query = () =>
      request(t.http)
        .post('/graphql')
        .send({ query: '{ stats { species { total } } }' });
    for (let i = 0; i < 3; i++) {
      const ok = await query();
      expect(ok.body.errors).toBeUndefined();
    }
    const refused = await query();
    expect(refused.body.errors?.[0]?.message).toMatch(/Too Many Requests/i);
  });

  it('never throttles the health check', async () => {
    for (let i = 0; i < 5; i++) {
      await request(t.http).get('/api/health').expect(200);
    }
  });
});
