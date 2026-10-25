import { Body, Controller, Get, Header, HttpCode, NotFoundException, Post, Query, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { Env } from '../../config/env.js';
import { MetaWebhookSignatureGuard } from './meta-signature.guard.js';
import { WebhookIngestionService } from './webhook-ingestion.service.js';

// Meta's handshake: GET ?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
const verifyQuery = z.looseObject({
  'hub.mode': z.literal('subscribe'),
  'hub.verify_token': z.string().min(1).max(256),
  // Echoed back verbatim, so only plain tokens are accepted (Meta sends digits).
  'hub.challenge': z.string().regex(/^[\w-]{1,200}$/),
});

const sha256 = (v: string) => createHash('sha256').update(v).digest();

// Provider-facing and unauthenticated by design: the signature (POST) and verify token (GET) are the auth.
@Controller('webhooks/meta')
@AllowAnonymous()
export class MetaWebhookController {
  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly ingestion: WebhookIngestionService,
  ) {}

  @Get()
  @Header('Content-Type', 'text/plain; charset=utf-8')
  verify(@Query() query: unknown): string {
    const expected = this.config.get('META_WEBHOOK_VERIFY_TOKEN', { infer: true });
    if (!expected) throw new NotFoundException();
    const parsed = verifyQuery.safeParse(query);
    // Hash both sides so the comparison is constant-time regardless of length.
    if (!parsed.success || !timingSafeEqual(sha256(parsed.data['hub.verify_token']), sha256(expected))) {
      throw new NotFoundException();
    }
    return parsed.data['hub.challenge'];
  }

  // Save durably first, then acknowledge; processing happens off the request path.
  @Post()
  @HttpCode(200)
  @UseGuards(MetaWebhookSignatureGuard)
  async receive(@Body() body: unknown): Promise<void> {
    await this.ingestion.ingest(body);
  }
}
