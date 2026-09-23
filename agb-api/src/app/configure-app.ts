import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import { readFileSync } from 'fs';
import helmet from 'helmet';
import { join } from 'path';
import { Logger } from 'winston';
import { accessLog } from '../common/http/access-log';
import { ConfigService } from '../config/config.service';
import { WINSTON_MODULE_PROVIDER } from '../winston/winston.constants';

/**
 * Everything applied to the HTTP app outside the module graph. `main.ts` and
 * the integration tests both call this, so the tests exercise the same
 * middleware as production.
 */
export function configureApp(
  app: NestExpressApplication,
  config: ConfigService,
): void {
  const logger = app.get<Logger>(WINSTON_MODULE_PROVIDER);

  app.disable('x-powered-by');
  if (config.get('TRUST_PROXY')) {
    app.set('trust proxy', 1);
  }
  app.use(
    helmet({
      // GraphiQL (dev only) loads its assets from a CDN. Elsewhere keep
      // helmet's policy, minus upgrade-insecure-requests: it would send the
      // Swagger UI's own assets to https:// on a plain-HTTP deployment.
      contentSecurityPolicy: config.isEnv('dev')
        ? false
        : { directives: { upgradeInsecureRequests: null } },
      // The data is public and meant to be fetched cross-origin.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(compression());
  app.use(accessLog(logger));
  app.enableCors({ origin: config.corsOrigins() });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
    }),
  );
  app.enableShutdownHooks();

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Ancestral Genomes API')
      .setDescription(
        'Reconstructed ancestral genomes and their extant descendants, from PANTHER. ' +
          'REST for lists and bulk downloads; GraphQL at /graphql for nested lookups.',
      )
      .setVersion(packageVersion())
      .build(),
  );
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
  });
}

function packageVersion(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), 'package.json'), 'utf8'),
    ) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}
