import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { ResultCacheModule } from '../common/cache/result-cache.module';
import { AppThrottlerGuard } from '../common/graphql/app-throttler.guard';
import { ComplexityPlugin } from '../common/graphql/complexity.plugin';
import { CacheControlInterceptor } from '../common/http/cache-control';
import { loggerOptions } from '../common/logging/logger-options';
import { ComparisonModule } from '../comparison/comparison.module';
import { ConfigModule } from '../config/config.module';
import { ConfigService } from '../config/config.service';
import { GenesModule } from '../genes/genes.module';
import { graphqlOptions } from '../graphql/graphql-options';
import { HealthModule } from '../health/health.module';
import { SpeciesModule } from '../species/species.module';
import { WinstonModule } from '../winston/winston.module';
import { AppController } from './app.controller';

/** Connection settings shared by the HTTP app and the CLI. */
export const DATA_IMPORTS = [
  ConfigModule,
  WinstonModule.forRootAsync({
    inject: [ConfigService],
    useFactory: loggerOptions,
  }),
  MongooseModule.forRootAsync({
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({
      uri: config.get('DB_URL'),
      serverSelectionTimeoutMS: 10000,
    }),
  }),
  ResultCacheModule,
];

@Module({
  imports: [
    ...DATA_IMPORTS,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get('THROTTLE_TTL_SECONDS') * 1000,
            limit: config.get('THROTTLE_LIMIT'),
          },
        ],
      }),
    }),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      inject: [ConfigService],
      useFactory: graphqlOptions,
    }),
    HealthModule,
    SpeciesModule,
    GenesModule,
    ComparisonModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: CacheControlInterceptor },
    ComplexityPlugin,
  ],
})
export class AppModule {}
