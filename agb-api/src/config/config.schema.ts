import Joi from 'joi';

export type AppEnv = 'dev' | 'prod' | 'test';

/**
 * Where GO (PAINT) annotations come from. The legacy API scraped pantree.org,
 * which now answers 403 to everything, so there is no scrape here: `none`
 * reports the annotations as unavailable, `database` reads the arrays stored on
 * each `genelists` document.
 */
export type PaintAnnotationsSource = 'none' | 'database';

export interface AppConfig {
  APP_ENV: AppEnv;
  SERVER_HOST: string;
  SERVER_PORT: number;
  /** Set behind a reverse proxy so throttling and logs see the client IP. */
  TRUST_PROXY: boolean;
  DB_URL: string;
  /** `maxTimeMS` for every query, so a runaway scan cannot pile up. */
  DB_QUERY_TIMEOUT_MS: number;
  /** `*` or a comma-separated list of origins. */
  CORS_ORIGINS: string;
  /** `Cache-Control: max-age` for successful REST GETs. */
  HTTP_CACHE_MAX_AGE: number;
  /** Time-to-live of the in-process result cache shared by REST and GraphQL. */
  CACHE_TTL_SECONDS: number;
  CACHE_MAX_ENTRIES: number;
  /** Row budget of the result cache; a gene list weighs one per row. */
  CACHE_MAX_ROWS: number;
  SPECIES_INDEX_TTL_SECONDS: number;
  THROTTLE_TTL_SECONDS: number;
  THROTTLE_LIMIT: number;
  GRAPHQL_MAX_DEPTH: number;
  GRAPHQL_MAX_COMPLEXITY: number;
  /** Largest `limit` a GraphQL list field accepts; bulk lists belong on REST. */
  GRAPHQL_MAX_PAGE_SIZE: number;
  PAINT_ANNOTATIONS_SOURCE: PaintAnnotationsSource;
  /** Reported by `/api/stats`; the data itself does not record its release. */
  PANTHER_VERSION?: string;
  LOG_LEVEL: string;
  LOG_DIR: string;
}

export const configSchema = Joi.object<AppConfig>({
  APP_ENV: Joi.string().valid('dev', 'prod', 'test').default('dev'),
  SERVER_HOST: Joi.string().default('0.0.0.0'),
  SERVER_PORT: Joi.number().port().default(3004),
  TRUST_PROXY: Joi.boolean().default(false),
  DB_URL: Joi.string()
    .pattern(/^mongodb(\+srv)?:\/\//)
    .default('mongodb://localhost:27017/ancGenomesDB15'),
  DB_QUERY_TIMEOUT_MS: Joi.number().integer().min(100).default(30000),
  CORS_ORIGINS: Joi.string().default('*'),
  HTTP_CACHE_MAX_AGE: Joi.number().integer().min(0).default(3600),
  CACHE_TTL_SECONDS: Joi.number().integer().min(0).default(7200),
  CACHE_MAX_ENTRIES: Joi.number().integer().min(0).default(500),
  CACHE_MAX_ROWS: Joi.number().integer().min(0).default(500000),
  SPECIES_INDEX_TTL_SECONDS: Joi.number().integer().min(1).default(600),
  THROTTLE_TTL_SECONDS: Joi.number().integer().min(1).default(60),
  THROTTLE_LIMIT: Joi.number().integer().min(1).default(300),
  GRAPHQL_MAX_DEPTH: Joi.number().integer().min(1).default(8),
  GRAPHQL_MAX_COMPLEXITY: Joi.number().integer().min(1).default(150000),
  GRAPHQL_MAX_PAGE_SIZE: Joi.number().integer().min(1).default(10000),
  PAINT_ANNOTATIONS_SOURCE: Joi.string()
    .valid('none', 'database')
    .default('none'),
  PANTHER_VERSION: Joi.string().optional(),
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly')
    .default('info'),
  LOG_DIR: Joi.string().default('logs'),
});
