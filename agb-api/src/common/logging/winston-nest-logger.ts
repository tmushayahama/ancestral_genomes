import { LoggerService } from '@nestjs/common';
import { Logger } from 'winston';

/**
 * Routes Nest's own log lines (bootstrap, route mapping, unhandled errors)
 * through the Winston logger, so production logs are one stream in one format.
 */
export class WinstonNestLogger implements LoggerService {
  constructor(private readonly logger: Logger) {}

  log(message: unknown, context?: string) {
    this.logger.info(String(message), { context });
  }

  error(message: unknown, trace?: string, context?: string) {
    this.logger.error(String(message), { context, trace });
  }

  warn(message: unknown, context?: string) {
    this.logger.warn(String(message), { context });
  }

  debug(message: unknown, context?: string) {
    this.logger.debug(String(message), { context });
  }

  verbose(message: unknown, context?: string) {
    this.logger.verbose(String(message), { context });
  }
}
