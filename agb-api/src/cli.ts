import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { CommandModule, CommandService } from 'nestjs-command';
import { CliModule } from './cli.module';

/** `npm run cli -- db:indexes` / `npm run cli -- data:check` */
async function main() {
  const app = await NestFactory.createApplicationContext(CliModule, {
    logger: ['error', 'warn'],
  });
  try {
    await app.select(CommandModule).get(CommandService).exec();
  } finally {
    // Close the Mongo connection so the process can exit.
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
