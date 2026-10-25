import { Module } from '@nestjs/common';
import { TenantPrismaService } from '../prisma/tenant-prisma.service.js';
import { QueueModule } from '../queue/queue.module.js';
import { TokenVaultService } from './token-vault.service.js';
import { InboundMessageService } from './webhooks/inbound-message.service.js';
import { MetaWebhookController } from './webhooks/meta-webhook.controller.js';
import { MetaWebhookSignatureGuard } from './webhooks/meta-signature.guard.js';
import { WebhookIngestionService } from './webhooks/webhook-ingestion.service.js';
import { WebhookProcessor } from './webhooks/webhook.processor.js';

@Module({
  imports: [QueueModule],
  controllers: [MetaWebhookController],
  providers: [
    TokenVaultService,
    TenantPrismaService,
    MetaWebhookSignatureGuard,
    WebhookIngestionService,
    InboundMessageService,
    WebhookProcessor,
  ],
  exports: [TokenVaultService],
})
export class ChannelsModule {}
