import { CallHandler, ExecutionContext, HttpException, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import type { Response } from 'express';
import { Observable, tap } from 'rxjs';
import type { RequestWithId } from './request-id.middleware.js';

// Logs only method, route template, status, latency and request id.
// Body, query string and headers are never logged, so tokens and message content cannot leak.
@Injectable()
export class AccessLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Access');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<RequestWithId & { route?: { path?: string } }>();
    const res = http.getResponse<Response>();
    const started = performance.now();

    const log = (status: number) =>
      this.logger.log({
        requestId: req.id,
        method: req.method,
        route: req.route?.path ?? 'unmatched',
        status,
        ms: Math.round(performance.now() - started),
      });

    return next.handle().pipe(
      tap({
        next: () => log(res.statusCode),
        // The exception filter has not run yet here, so res.statusCode is still the default.
        error: (err: unknown) => log(err instanceof HttpException ? err.getStatus() : 500),
      }),
    );
  }
}
