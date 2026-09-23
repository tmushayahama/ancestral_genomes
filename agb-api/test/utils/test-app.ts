import { NestExpressApplication } from '@nestjs/platform-express';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Connection, Model } from 'mongoose';
import { AppModule } from '../../src/app/app.module';
import { configureApp } from '../../src/app/configure-app';
import { ConfigService } from '../../src/config/config.service';
import { FLAT_GENE_MODEL } from '../../src/genes/schemas/flat-gene.schema';
import { GENE_MODEL } from '../../src/genes/schemas/gene.schema';
import { SHORT_GENE_MODEL } from '../../src/genes/schemas/short-gene.schema';
import { FLAT_GENES, GENES, SHORT_GENES, SPECIES } from '../fixtures/seed';

export interface TestApp {
  app: NestExpressApplication;
  /** The Express server, for supertest. */
  http: ReturnType<NestExpressApplication['getHttpServer']>;
  close: () => Promise<void>;
}

/** The test server's URI with its own database name. */
function databaseUrl(database: string): string {
  const base = process.env.AGB_TEST_DB_URL;
  if (!base) {
    throw new Error(
      'AGB_TEST_DB_URL is not set; run through test:integration.',
    );
  }
  const url = new URL(base);
  url.pathname = `/${database}`;
  return url.toString();
}

/**
 * The real AppModule, configured exactly as `main.ts` does, against a fresh
 * database seeded with the fixture miniature of ancGenomesDB15.
 */
export async function createTestApp(
  database: string,
  env: Record<string, string> = {},
): Promise<TestApp> {
  const config = new ConfigService({
    APP_ENV: 'test',
    DB_URL: databaseUrl(database),
    THROTTLE_LIMIT: '100000',
    ...env,
  });

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ConfigService)
    .useValue(config)
    .compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app, config);
  await app.init();

  const connection = app.get<Connection>(getConnectionToken());
  await connection.dropDatabase();
  const db = connection.db!;
  await db.collection('species').insertMany(SPECIES.map((doc) => ({ ...doc })));
  await db.collection('genelists').insertMany(GENES.map((doc) => ({ ...doc })));
  await db
    .collection('short_genelists')
    .insertMany(SHORT_GENES.map((doc) => ({ ...doc })));
  await db
    .collection('flat_genelists')
    .insertMany(FLAT_GENES.map((doc) => ({ ...doc })));
  // Build the declared indexes, as `npm run cli -- db:indexes` would.
  for (const token of [GENE_MODEL, SHORT_GENE_MODEL, FLAT_GENE_MODEL]) {
    await app.get<Model<unknown>>(getModelToken(token)).createIndexes();
  }

  return {
    app,
    http: app.getHttpServer(),
    close: async () => {
      await connection.dropDatabase();
      await app.close();
    },
  };
}
