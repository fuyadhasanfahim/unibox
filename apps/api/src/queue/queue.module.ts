import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import type { Env } from '../config/env.js';

export const WEBHOOK_QUEUE = 'webhook-events';
export const OUTBOUND_QUEUE = 'outbound-messages';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        // BullMQ workers need maxRetriesPerRequest=null so blocking commands wait out Redis restarts.
        connection: new Redis(config.get('REDIS_URL', { infer: true }), { maxRetriesPerRequest: null }),
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: 'exponential', delay: 2_000 },
          removeOnComplete: { age: 3600, count: 1000 },
          // Failed jobs stay for inspection; the DB row (WebhookEvent/OutboxEvent) is the source of truth.
          removeOnFail: { age: 7 * 24 * 3600 },
        },
      }),
    }),
    BullModule.registerQueue({ name: WEBHOOK_QUEUE }, { name: OUTBOUND_QUEUE }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
