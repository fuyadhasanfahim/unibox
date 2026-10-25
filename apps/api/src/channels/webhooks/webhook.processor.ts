import { InjectQueue, OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { WEBHOOK_QUEUE } from '../../queue/queue.module.js';
import { InboundMessageService } from './inbound-message.service.js';
import type { MetaEvent } from './meta-events.js';

type WebhookJob = { webhookEventId?: string };

// Failures we expect to clear on retry (e.g. the channel is still being connected). Only `code` is stored.
class RetryableError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

const SWEEP_EVERY_MS = 60_000;
// Saved but never queued (Redis was down at delivery time): older than this means nobody is on it.
const SWEEP_AFTER_MS = 30_000;
const SWEEP_BATCH = 200;

// ponytail: runs inside the API process. Split into its own worker process when load needs it.
@Injectable()
@Processor(WEBHOOK_QUEUE)
export class WebhookProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inbound: InboundMessageService,
    @InjectQueue(WEBHOOK_QUEUE) private readonly queue: Queue,
  ) {
    super();
  }

  async onModuleInit() {
    await this.queue.upsertJobScheduler('sweep-pending', { every: SWEEP_EVERY_MS }, { name: 'sweep', opts: { attempts: 1 } });
  }

  async process(job: Job<WebhookJob>): Promise<void> {
    if (job.name === 'sweep') return this.sweep();
    const id = job.data.webhookEventId;
    if (!id) return;
    try {
      await this.handle(id);
    } catch (err) {
      await this.recordFailure(id, job, err);
      throw err;
    }
  }

  private async handle(id: string): Promise<void> {
    // Claim: succeeded and dead-lettered events are never touched again, so duplicate jobs are harmless.
    const claimed = await this.prisma.webhookEvent.updateMany({
      where: { id, status: { in: ['pending', 'failed', 'processing'] } },
      data: { status: 'processing', attempts: { increment: 1 } },
    });
    if (!claimed.count) return;

    const row = await this.prisma.webhookEvent.findUniqueOrThrow({ where: { id }, select: { payload: true } });
    const event = row.payload as unknown as MetaEvent;

    const account = await this.prisma.channelAccount.findUnique({
      where: { type_externalAccountId: { type: event.channel, externalAccountId: event.accountId } },
      select: { id: true, tenantId: true, status: true, tenant: { select: { status: true } } },
    });
    if (!account) throw new RetryableError('UNKNOWN_ACCOUNT');

    let outcome: string | null = null;
    if (account.status === 'disabled' || account.tenant.status !== 'active') {
      outcome = 'ACCOUNT_INACTIVE';
    } else if (event.kind === 'message') {
      await this.inbound.applyMessage(account, event);
    } else if (!(await this.inbound.applyStatus(account, event))) {
      outcome = 'MESSAGE_NOT_FOUND';
    }

    // The data now lives in Message; drop the copy of the text from the event, keeping its digest.
    await this.prisma.webhookEvent.update({
      where: { id },
      data: { status: 'succeeded', processedAt: new Date(), channelAccountId: account.id, lastErrorCode: outcome, payload: Prisma.DbNull },
    });
  }

  private async recordFailure(id: string, job: Job<WebhookJob>, err: unknown): Promise<void> {
    const code = err instanceof RetryableError ? err.code : 'PROCESSING_ERROR';
    const lastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
    // Log the error class only: messages can carry customer data.
    this.logger.warn(`webhook ${id} failed (${code}, ${(err as Error).name}, attempt ${job.attemptsMade + 1})`);
    await this.prisma.webhookEvent.updateMany({
      where: { id, status: { notIn: ['succeeded', 'dead_letter'] } },
      data: { status: lastAttempt ? 'dead_letter' : 'failed', lastErrorCode: code },
    });
  }

  private async sweep(): Promise<void> {
    const stale = await this.prisma.webhookEvent.findMany({
      where: { status: 'pending', receivedAt: { lt: new Date(Date.now() - SWEEP_AFTER_MS) } },
      orderBy: { receivedAt: 'asc' },
      take: SWEEP_BATCH,
      select: { id: true },
    });
    if (!stale.length) return;
    // jobId is unique per minute: re-adding an old id would be ignored while its finished job is still kept.
    const bucket = Math.floor(Date.now() / SWEEP_EVERY_MS);
    await this.queue.addBulk(stale.map((r) => ({ name: 'process', data: { webhookEventId: r.id }, opts: { jobId: `${r.id}-s${bucket}` } })));
    this.logger.log(`re-queued ${stale.length} stale webhook events`);
  }

  @OnWorkerEvent('error')
  onError(err: Error) {
    this.logger.error(`webhook worker error: ${err.name}`);
  }
}
