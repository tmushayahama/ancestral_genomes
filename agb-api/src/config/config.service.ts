import { AppConfig, AppEnv, configSchema } from './config.schema';

/**
 * Validated configuration. The shape follows the c-api template (`get`,
 * `isEnv`), but it validates `process.env` rather than reading a `.env` file
 * itself: `main.ts` loads `.env` through `dotenv` when one exists, so a Docker
 * run with injected variables needs no file at all.
 */
export class ConfigService {
  private readonly values: AppConfig;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.values = ConfigService.validate(env);
  }

  /**
   * Empty strings count as unset, so `PANTHER_VERSION=` in a `.env` file falls
   * back to the default instead of failing validation.
   */
  static validate(env: NodeJS.ProcessEnv): AppConfig {
    const present = Object.fromEntries(
      Object.entries(env).filter(
        ([, value]) => value !== undefined && value !== '',
      ),
    );
    const { error, value } = configSchema.validate(present, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    if (error) {
      throw new Error(`Config validation error: ${error.message}`);
    }
    return value as AppConfig;
  }

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.values[key];
  }

  isEnv(env: AppEnv): boolean {
    return this.values.APP_ENV === env;
  }

  corsOrigins(): string | string[] {
    const raw = this.values.CORS_ORIGINS.trim();
    if (raw === '*') {
      return '*';
    }
    return raw
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }
}
