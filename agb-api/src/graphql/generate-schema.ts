import { NestFactory } from '@nestjs/core';
import {
  GraphQLSchemaBuilderModule,
  GraphQLSchemaFactory,
} from '@nestjs/graphql';
import { writeFileSync } from 'fs';
import { lexicographicSortSchema, printSchema } from 'graphql';
import { join } from 'path';
import { RESOLVERS } from './resolvers';

export const SCHEMA_FILE = join(__dirname, '..', 'schema.gql');

const HEADER =
  '# Generated from the code-first resolvers by `npm run schema:generate`.\n' +
  '# Do not edit; a unit test fails when this file is out of date.\n\n';

/** The SDL of the API, built from decorators alone (no database, no HTTP). */
export async function buildSchemaSdl(): Promise<string> {
  const app = await NestFactory.create(GraphQLSchemaBuilderModule, {
    logger: false,
  });
  try {
    await app.init();
    const schema = await app.get(GraphQLSchemaFactory).create(RESOLVERS);
    return `${HEADER}${printSchema(lexicographicSortSchema(schema))}\n`;
  } finally {
    await app.close();
  }
}

if (require.main === module) {
  buildSchemaSdl()
    .then((sdl) => {
      writeFileSync(SCHEMA_FILE, sdl);
      console.log(`Wrote ${SCHEMA_FILE}`);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
