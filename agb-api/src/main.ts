import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'winston';
import { AppModule } from './app/app.module';
import { configureApp } from './app/configure-app';
import { WinstonNestLogger } from './common/logging/winston-nest-logger';
import { ConfigService } from './config/config.service';
import { WINSTON_MODULE_PROVIDER } from './winston/winston.constants';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const logger = app.get<Logger>(WINSTON_MODULE_PROVIDER);
  app.useLogger(new WinstonNestLogger(logger));

  const config = app.get(ConfigService);
  configureApp(app, config);

  const host = config.get('SERVER_HOST');
  const port = config.get('SERVER_PORT');
  await app.listen(port, host);
  logger.info(`AGB API listening on http://${host}:${port}`, {
    context: 'bootstrap',
    env: config.get('APP_ENV'),
  });
}

void bootstrap();
