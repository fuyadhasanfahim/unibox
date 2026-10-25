import { Injectable } from '@nestjs/common';
import type { MessageStatus } from '@repo/shared';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service.js';
import type { MetaEvent, StatusValue } from './meta-events.js';

type MessageEvent = Extract<MetaEvent, { kind: 'message' }>;
type StatusEvent = Extract<MetaEvent, { kind: 'status' }>;
type Account = { id: string; tenantId: string };

const PREVIEW_LENGTH = 120;
// A status only moves forward: webhooks arrive out of order ("read" before "delivered").
const STATUS_RANK: Partial<Record<MessageStatus, number>> = { queued: 0, sending: 1, sent: 2, delivered: 3, read: 4 };

// Writes normalized webhook events into the tenant's data. Every call is tenant-scoped and idempotent,
// so a retried or duplicated job changes nothing.
@Injectable()
export class InboundMessageService {
  constructor(private readonly tenants: TenantPrismaService) {}

  async applyMessage(account: Account, event: MessageEvent): Promise<void> {
    const { message } = event;
    const { tenantId } = account;
    const channelAccountId = account.id;
    const at = new Date(message.at);

    await this.tenants.forTenant(tenantId).$transaction(async (tx) => {
      if (await tx.message.findFirst({ where: { channelAccountId, externalMessageId: message.id }, select: { id: true } })) return;

      const identity = await tx.contactIdentity.findFirst({ where: { channelAccountId, externalUserId: message.from }, select: { contactId: true } });
      let contactId = identity?.contactId;
      if (contactId) {
        if (message.name) await tx.contact.updateMany({ where: { id: contactId, displayName: null }, data: { displayName: message.name } });
      } else {
        const contact = await tx.contact.create({
          data: { tenantId, displayName: message.name ?? null, phoneE164: event.channel === 'whatsapp' ? `+${message.from}` : null },
          select: { id: true },
        });
        contactId = contact.id;
        await tx.contactIdentity.create({ data: { tenantId, channelAccountId, contactId, externalUserId: message.from } });
      }

      // One conversation per customer per connected account.
      let conversation = await tx.conversation.findFirst({ where: { channelAccountId, externalConversationId: message.from }, select: { id: true } });
      conversation ??= await tx.conversation.create({
        data: { tenantId, channelAccountId, contactId, externalConversationId: message.from },
        select: { id: true },
      });

      await tx.message.create({
        data: {
          tenantId,
          conversationId: conversation.id,
          channelAccountId,
          externalMessageId: message.id,
          direction: 'inbound',
          status: 'received',
          messageType: message.type,
          text: message.text ?? null,
          senderExternalId: message.from,
          providerTimestamp: at,
        },
      });

      // Latest-wins for the summary fields, even if an older message is processed late.
      await tx.conversation.updateMany({
        where: { id: conversation.id, OR: [{ lastMessageAt: null }, { lastMessageAt: { lte: at } }] },
        data: { lastMessageAt: at, lastMessagePreview: preview(message) },
      });
      await tx.conversation.updateMany({
        where: { id: conversation.id, OR: [{ lastInboundAt: null }, { lastInboundAt: { lt: at } }] },
        data: { lastInboundAt: at },
      });
      // A customer writing again reopens a closed conversation.
      await tx.conversation.updateMany({ where: { id: conversation.id }, data: { unreadCount: { increment: 1 }, status: 'open' } });
    });
  }

  // Returns false when we have no such outbound message (e.g. sent from the phone, outside Unibox).
  async applyStatus(account: Account, event: StatusEvent): Promise<boolean> {
    const channelAccountId = account.id;
    const { id, value } = event.status;

    return this.tenants.forTenant(account.tenantId).$transaction(async (tx) => {
      const found = await tx.message.findFirst({ where: { channelAccountId, externalMessageId: id, direction: 'outbound' }, select: { id: true, status: true } });
      if (!found) return false;
      if (advances(found.status as MessageStatus, value)) {
        await tx.message.updateMany({ where: { id: found.id }, data: { status: value } });
      }
      return true;
    });
  }
}

function preview(m: MessageEvent['message']): string {
  return m.text ? m.text.slice(0, PREVIEW_LENGTH) : `[${m.type}]`;
}

function advances(current: MessageStatus, next: StatusValue): boolean {
  // A failure is final unless the customer already read it.
  if (next === 'failed') return current !== 'read' && current !== 'failed';
  return (STATUS_RANK[next] ?? -1) > (STATUS_RANK[current] ?? -1);
}

