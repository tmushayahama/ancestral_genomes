import { NextFunction, Request, RequestHandler, Response } from 'express';
import { Logger } from 'winston';

/**
 * One line per request, written when the response finishes. This replaces the
 * legacy API's `console.log(lists)`, which dumped every row of a proxy gene
 * list to stdout synchronously on each request.
 */
export function accessLog(logger: Logger): RequestHandler {
  return (request: Request, response: Response, next: NextFunction) => {
    const started = process.hrtime.bigint();
    response.on('finish', () => {
      const ms = Number(process.hrtime.bigint() - started) / 1e6;
      logger.info(
        `${request.method} ${request.originalUrl} ${response.statusCode} ${ms.toFixed(1)}ms`,
        {
          context: 'http',
          method: request.method,
          url: request.originalUrl,
          status: response.statusCode,
          ms: Math.round(ms * 10) / 10,
          ip: request.ip,
        },
      );
    });
    next();
  };
}
