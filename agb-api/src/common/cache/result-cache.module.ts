import { Global, Module } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { ResultCache } from './result-cache';

@Global()
@Module({
  providers: [
    {
      provide: ResultCache,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new ResultCache({
          ttlMs: config.get('CACHE_TTL_SECONDS') * 1000,
          maxEntries: config.get('CACHE_MAX_ENTRIES'),
          maxRows: config.get('CACHE_MAX_ROWS'),
        }),
    },
  ],
  exports: [ResultCache],
})
export class ResultCacheModule {}
