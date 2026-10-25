import { CanActivate, ExecutionContext, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import type { Env } from '../../config/env.js';

// Meta signs the exact request bytes with the app secret: X-Hub-Signature-256: sha256=<hex>.
// Verified over the raw body (not re-serialized JSON), in constant time, before anything is stored.
@Injectable()
export class MetaWebhookSignatureGuard implements CanActivate {
  constructor(private readonly config: ConfigService<Env, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const secret = this.config.get('META_APP_SECRET', { infer: true });
    // Channels are off until a Meta app is configured: behave as if the route does not exist.
    if (!secret) throw new NotFoundException();

    const req = context.switchToHttp().getRequest<Request & { rawBody?: Buffer }>();
    const header = req.headers['x-hub-signature-256'];
    const given = typeof header === 'string' ? /^sha256=([0-9a-f]{64})$/i.exec(header)?.[1] : undefined;
    if (!given || !req.rawBody) throw new UnauthorizedException();

    const expected = createHmac('sha256', secret).update(req.rawBody).digest();
    // Both are 32 bytes, so timingSafeEqual cannot throw on length.
    if (!timingSafeEqual(Buffer.from(given, 'hex'), expected)) throw new UnauthorizedException();
    return true;
  }
}
