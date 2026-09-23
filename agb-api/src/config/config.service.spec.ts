import { ConfigService } from './config.service';

describe('ConfigService', () => {
  it('applies defaults when nothing is set', () => {
    const config = new ConfigService({});

    expect(config.get('APP_ENV')).toBe('dev');
    expect(config.get('SERVER_PORT')).toBe(3004);
    expect(config.get('DB_URL')).toBe(
      'mongodb://localhost:27017/ancGenomesDB15',
    );
    expect(config.get('PAINT_ANNOTATIONS_SOURCE')).toBe('none');
    expect(config.get('TRUST_PROXY')).toBe(false);
    expect(config.isEnv('dev')).toBe(true);
  });

  it('converts numbers and booleans from their string form', () => {
    const config = new ConfigService({
      SERVER_PORT: '8080',
      TRUST_PROXY: 'true',
      CACHE_MAX_ROWS: '10',
    });

    expect(config.get('SERVER_PORT')).toBe(8080);
    expect(config.get('TRUST_PROXY')).toBe(true);
    expect(config.get('CACHE_MAX_ROWS')).toBe(10);
  });

  it('treats empty strings as unset rather than invalid', () => {
    const config = new ConfigService({ PANTHER_VERSION: '', SERVER_PORT: '' });

    expect(config.get('PANTHER_VERSION')).toBeUndefined();
    expect(config.get('SERVER_PORT')).toBe(3004);
  });

  it('ignores unrelated environment variables', () => {
    expect(
      () => new ConfigService({ PATH: '/usr/bin', HOME: '/root' }),
    ).not.toThrow();
  });

  it('rejects values outside the allowed set, naming every problem', () => {
    expect(
      () =>
        new ConfigService({
          APP_ENV: 'staging',
          PAINT_ANNOTATIONS_SOURCE: 'pantree',
        }),
    ).toThrow(/APP_ENV.*PAINT_ANNOTATIONS_SOURCE/s);
  });

  it('rejects a DB_URL that is not a MongoDB connection string', () => {
    expect(() => new ConfigService({ DB_URL: 'postgres://x' })).toThrow(
      /DB_URL/,
    );
  });

  it('parses CORS origins', () => {
    expect(new ConfigService({}).corsOrigins()).toBe('*');
    expect(
      new ConfigService({
        CORS_ORIGINS: 'https://a.org, https://b.org ,',
      }).corsOrigins(),
    ).toEqual(['https://a.org', 'https://b.org']);
  });
});
