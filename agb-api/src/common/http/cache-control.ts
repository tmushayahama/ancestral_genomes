import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { ConfigService } from '../../config/config.service';

const CACHE_CONTROL_KEY = 'agb:cache-control';

/** Overrides the default `Cache-Control` of a REST route. */
export const CacheControl = (value: string) =>
  SetMetadata(CACHE_CONTROL_KEY, value);

export const NoStore = () => CacheControl('no-store');

/**
 * The data only changes at release time, so successful REST GETs are marked
 * cacheable by browsers and proxies (`HTTP_CACHE_MAX_AGE`). Errors skip this
 * path and carry no caching header. GraphQL is left alone: its POSTs are not
 * HTTP-cacheable, and the result cache covers it instead.
 */
@Injectable()
export class CacheControlInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const override = this.reflector.getAllAndOverride<string | undefined>(
      CACHE_CONTROL_KEY,
      [context.getHandler(), context.getClass()],
    );

    return next.handle().pipe(
      tap(() => {
        if (request.method !== 'GET' || response.headersSent) {
          return;
        }
        response.setHeader(
          'Cache-Control',
          override ??
            `public, max-age=${this.config.get('HTTP_CACHE_MAX_AGE')}`,
        );
      }),
    );
  }
}
