import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { createHash } from 'node:crypto';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { WEBHOOK_QUEUE } from '../../queue/queue.module.js';
import { parseMetaPayload } from './meta-events.js';

export const WEBHOOK_PROVIDER = 'meta';

@Injectable()
export class WebhookIngestionService {
  private readonly logger = new Logger(WebhookIngestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(WEBHOOK_QUEUE) private readonly queue: Queue,
  ) {}

  // Called only after the signature check. Returns once every event is saved.
  async ingest(body: unknown): Promise<number> {
    const events = parseMetaPayload(body);
    if (!events.length) return 0;

    const accounts = await this.prisma.channelAccount.findMany({
      where: { OR: events.map((e) => ({ type: e.channel, externalAccountId: e.accountId })) },
      select: { id: true, type: true, externalAccountId: true },
    });
    const accountId = (type: string, external: string) => accounts.find((a) => a.type === type && a.externalAccountId === external)?.id ?? null;

    // skipDuplicates + the unique (provider, key) index = dedupe; only genuinely new events come back.
    const saved = await this.prisma.webhookEvent.createManyAndReturn({
      data: events.map((e) => ({
        provider: WEBHOOK_PROVIDER,
        externalEventKey: e.key,
        channelAccountId: accountId(e.channel, e.accountId),
        payloadDigest: createHash('sha256').update(JSON.stringify(e)).digest('hex'),
        payload: e as unknown as Prisma.InputJsonValue,
      })),
      skipDuplicates: true,
      select: { id: true },
    });

    // A queue outage must not fail the delivery: the rows are saved and the sweeper re-queues them.
    try {
      await this.queue.addBulk(saved.map((r) => ({ name: 'process', data: { webhookEventId: r.id }, opts: { jobId: r.id } })));
    } catch (err) {
      this.logger.error(`Could not queue ${saved.length} webhook events; the sweeper will retry (${(err as Error).name})`);
    }
    return saved.length;
  }
}
