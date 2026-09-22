import { Injectable, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { WINSTON_MODULE_PROVIDER } from './winston.constants';
import { WinstonModule } from './winston.module';

describe('Winston Module', () => {
  it('boots successfully', async () => {
    const rootModule = await Test.createTestingModule({
      imports: [WinstonModule.forRoot({})],
    }).compile();

    expect(typeof rootModule.get(WINSTON_MODULE_PROVIDER)).toBe('object');
  });

  it('boots successfully asynchronously', async () => {
    @Injectable()
    class ConfigService {
      public loggerOptions = {};
    }

    @Module({
      providers: [ConfigService],
      exports: [ConfigService],
    })
    class FeatureModule {}

    const rootModule = await Test.createTestingModule({
      imports: [
        WinstonModule.forRootAsync({
          imports: [FeatureModule],
          useFactory: (cfg: ConfigService) => cfg.loggerOptions,
          inject: [ConfigService],
        }),
      ],
    }).compile();

    const app = rootModule.createNestApplication();
    await app.init();

    expect(typeof rootModule.get(WINSTON_MODULE_PROVIDER)).toBe('object');
  });
});
