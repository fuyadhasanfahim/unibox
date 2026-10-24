import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';
import { z } from 'zod';
import type { RequestWithId } from './request-id.middleware.js';

const CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  422: 'UNPROCESSABLE',
  429: 'RATE_LIMITED',
};

export type ErrorEnvelope = {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: { path: string; message: string }[];
  };
};

// Stable error shape for every failure. Stack traces and internal errors stay in the server log only.
@Catch()
export class ErrorEnvelopeFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorEnvelopeFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const req = http.getRequest<RequestWithId>();
    const res = http.getResponse<Response>();
    const requestId = req.id ?? 'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Something went wrong';
    let details: ErrorEnvelope['error']['details'];

    if (exception instanceof ZodValidationException) {
      status = HttpStatus.BAD_REQUEST;
      code = 'VALIDATION_ERROR';
      message = 'Request validation failed';
      const zodError = exception.getZodError();
      if (zodError instanceof z.ZodError) {
        details = zodError.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
      }
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = CODES[status] ?? 'HTTP_ERROR';
      // Only expose the message for client errors; 5xx stays generic.
      if (status < 500) message = exception.message;
    }

    if (status >= 500) {
      this.logger.error({ requestId, err: exception instanceof Error ? exception.stack : String(exception) });
    }

    const body: ErrorEnvelope = { error: { code, message, requestId, ...(details && { details }) } };
    res.status(status).json(body);
  }
}
