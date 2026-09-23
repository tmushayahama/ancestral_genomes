import { join } from 'path';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { ConfigService } from '../../config/config.service';

/**
 * As in c-api: console in dev, console plus rotated JSON files in prod. Tests
 * log nothing unless `LOG_LEVEL` asks for it.
 */
export function loggerOptions(config: ConfigService): winston.LoggerOptions {
  const level = config.get('LOG_LEVEL');
  const defaultMeta = { service: 'agb-api' };

  if (config.isEnv('prod')) {
    const dir = config.get('LOG_DIR');
    return {
      level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
      defaultMeta,
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({
          filename: join(dir, 'error.log'),
          level: 'error',
        }),
        new DailyRotateFile({
          filename: join(dir, 'application-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
        }),
      ],
    };
  }

  return {
    level,
    defaultMeta,
    silent: config.isEnv('test') && level !== 'debug',
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
        ),
      }),
    ],
  };
}
