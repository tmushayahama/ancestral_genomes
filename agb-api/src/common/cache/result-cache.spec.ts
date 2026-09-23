import { ResultCache } from './result-cache';

describe('ResultCache', () => {
  const build = (
    overrides: Partial<ConstructorParameters<typeof ResultCache>[0]> = {},
  ) => {
    let clock = 0;
    const cache = new ResultCache({
      ttlMs: 1000,
      maxEntries: 10,
      maxRows: 100,
      now: () => clock,
      ...overrides,
    });
    return {
      cache,
      advance: (ms: number) => {
        clock += ms;
      },
    };
  };

  it('returns the cached value without calling the loader again', async () => {
    const { cache } = build();
    const load = jest.fn().mockResolvedValue('value');

    await cache.wrap('k', load);
    const second = await cache.wrap('k', load);

    expect(second).toBe('value');
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('caches null results too (a missing gene stays missing)', async () => {
    const { cache } = build();
    const load = jest.fn().mockResolvedValue(null);

    await cache.wrap('k', load);
    expect(await cache.wrap('k', load)).toBeNull();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('shares one load between concurrent callers of a cold key', async () => {
    const { cache } = build();
    let resolve!: (value: string) => void;
    const load = jest.fn(() => new Promise<string>((done) => (resolve = done)));

    const first = cache.wrap('k', load);
    const second = cache.wrap('k', load);
    resolve('shared');

    await expect(first).resolves.toBe('shared');
    await expect(second).resolves.toBe('shared');
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('does not cache failures', async () => {
    const { cache } = build();
    const load = jest
      .fn()
      .mockRejectedValueOnce(new Error('db down'))
      .mockResolvedValueOnce('recovered');

    await expect(cache.wrap('k', load)).rejects.toThrow('db down');
    await expect(cache.wrap('k', load)).resolves.toBe('recovered');
  });

  it('expires entries after the TTL', async () => {
    const { cache, advance } = build();
    const load = jest.fn().mockResolvedValue('v');

    await cache.wrap('k', load);
    advance(1001);
    await cache.wrap('k', load);

    expect(load).toHaveBeenCalledTimes(2);
  });

  it('evicts the least recently used entry beyond maxEntries', async () => {
    const { cache } = build({ maxEntries: 2 });
    const load = (value: string) => jest.fn().mockResolvedValue(value);
    const a = load('a');

    await cache.wrap('a', a);
    await cache.wrap('b', load('b'));
    await cache.wrap('a', a); // a is now the most recent
    await cache.wrap('c', load('c')); // evicts b

    const b = load('b2');
    await cache.wrap('b', b);
    await cache.wrap('a', a);
    expect(b).toHaveBeenCalledTimes(1);
    expect(a).toHaveBeenCalledTimes(2); // re-loaded after b2 pushed it out
    expect(cache.stats().entries).toBe(2);
  });

  it('weighs pages by their rows and keeps within the row budget', async () => {
    const { cache } = build({ maxRows: 5 });
    const page = (n: number) => ({
      items: Array.from({ length: n }, (_, i) => i),
    });

    await cache.wrap('three', () => Promise.resolve(page(3)));
    await cache.wrap('two', () => Promise.resolve(page(2)));
    expect(cache.stats()).toEqual({ entries: 2, rows: 5 });

    await cache.wrap('one', () => Promise.resolve(page(1)));
    expect(cache.stats()).toEqual({ entries: 2, rows: 3 });
  });

  it('never stores a result bigger than the whole row budget', async () => {
    const { cache } = build({ maxRows: 5 });
    const load = jest.fn().mockResolvedValue({ items: new Array(6).fill(0) });

    await cache.wrap('huge', load);
    await cache.wrap('huge', load);

    expect(load).toHaveBeenCalledTimes(2);
    expect(cache.stats().rows).toBe(0);
  });

  it('is a pass-through when disabled', async () => {
    const { cache } = build({ ttlMs: 0 });
    const load = jest.fn().mockResolvedValue('v');

    await cache.wrap('k', load);
    await cache.wrap('k', load);

    expect(load).toHaveBeenCalledTimes(2);
  });
});
