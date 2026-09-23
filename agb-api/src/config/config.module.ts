import { Global, Module } from '@nestjs/common';
import { ConfigService } from './config.service';

/**
 * Global so feature modules can inject `ConfigService` without importing this
 * module. The factory reads `process.env` when the container is built, which is
 * after `main.ts` has run `dotenv`. Tests override the provider with an
 * explicit `new ConfigService({...})` instead of mutating `process.env`.
 */
@Global()
@Module({
  providers: [
    {
      provide: ConfigService,
      useFactory: () => new ConfigService(process.env),
    },
  ],
  exports: [ConfigService],
})
export class ConfigModule {}
