import { existsSync, readFileSync } from 'fs';
import { buildSchemaSdl, SCHEMA_FILE } from './generate-schema';

/**
 * `src/schema.gql` is the committed contract of the GraphQL API. This fails
 * when a decorator change alters the schema without the file being
 * regenerated, so every schema change shows up as a reviewable diff.
 */
describe('GraphQL schema', () => {
  it('matches the committed src/schema.gql (run `npm run schema:generate`)', async () => {
    expect(existsSync(SCHEMA_FILE)).toBe(true);
    const committed = readFileSync(SCHEMA_FILE, 'utf8').replace(/\r\n/g, '\n');
    expect(await buildSchemaSdl()).toBe(committed);
  }, 30000);
});
