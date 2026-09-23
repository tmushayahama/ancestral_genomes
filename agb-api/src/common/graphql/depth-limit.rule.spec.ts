import { buildSchema, parse, validate } from 'graphql';
import { depthLimitRule } from './depth-limit.rule';

const schema = buildSchema(`
  type Node { name: String, parent: Node, children: [Node] }
  type Query { node: Node }
`);

const errorsFor = (query: string, max: number) =>
  validate(schema, parse(query), [depthLimitRule(max)]).map((e) => e.message);

describe('depthLimitRule', () => {
  it('accepts a query at the limit', () => {
    expect(errorsFor('{ node { parent { name } } }', 3)).toEqual([]);
  });

  it('rejects a query one level deeper', () => {
    expect(errorsFor('{ node { parent { parent { name } } } }', 3)).toEqual([
      'Query depth 4 exceeds the maximum of 3.',
    ]);
  });

  it('follows fragment spreads and inline fragments', () => {
    const query = `
      query { node { ...Deep } }
      fragment Deep on Node { children { ... on Node { parent { name } } } }
    `;
    expect(errorsFor(query, 3)).toEqual([
      'Query depth 4 exceeds the maximum of 3.',
    ]);
    expect(errorsFor(query, 4)).toEqual([]);
  });

  it('does not count introspection', () => {
    const query =
      '{ __schema { types { fields { type { ofType { ofType { name } } } } } } }';
    expect(errorsFor(query, 1)).toEqual([]);
  });

  it('survives a fragment cycle (graphql reports the cycle itself)', () => {
    const query = `
      { node { ...A } }
      fragment A on Node { parent { ...B } }
      fragment B on Node { children { ...A } }
    `;
    expect(() => errorsFor(query, 10)).not.toThrow();
  });
});
