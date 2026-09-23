import { MongoMemoryServer } from 'mongodb-memory-server';

/**
 * One in-memory MongoDB for the whole integration run. Set AGB_TEST_DB_URL to
 * use a real server instead (each suite still gets its own database, dropped
 * afterwards). The first run downloads a mongod binary into the npm cache.
 */
export default async function globalSetup(): Promise<void> {
  if (process.env.AGB_TEST_DB_URL) {
    return;
  }
  const server = await MongoMemoryServer.create();
  (globalThis as { __AGB_MONGO__?: MongoMemoryServer }).__AGB_MONGO__ = server;
  process.env.AGB_TEST_DB_URL = server.getUri();
}
