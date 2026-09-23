import { MongoMemoryServer } from 'mongodb-memory-server';

export default async function globalTeardown(): Promise<void> {
  const server = (globalThis as { __AGB_MONGO__?: MongoMemoryServer })
    .__AGB_MONGO__;
  await server?.stop();
}
