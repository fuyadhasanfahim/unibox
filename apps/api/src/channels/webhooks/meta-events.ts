import type { ChannelType } from '@repo/shared';
import { z } from 'zod';

// What we keep from a Meta webhook delivery: one small, already-normalized record per message or
// status change. The raw payload is never stored.
export type MetaEvent = {
  // Idempotency key built from the provider's own ids; Meta may deliver the same event more than once.
  key: string;
  channel: ChannelType;
  // Provider account the event belongs to: WhatsApp phone_number_id, Page id or Instagram account id.
  accountId: string;
} & (
  | { kind: 'message'; message: { id: string; from: string; name?: string; type: string; text?: string; at: string } }
  | { kind: 'status'; status: { id: string; value: StatusValue; at: string } }
);

export type StatusValue = 'sent' | 'delivered' | 'read' | 'failed';
const STATUS_VALUES: readonly string[] = ['sent', 'delivered', 'read', 'failed'];

const CHANNEL_BY_OBJECT: Record<string, ChannelType> = {
  whatsapp_business_account: 'whatsapp',
  page: 'messenger',
  instagram: 'instagram',
};

const envelope = z.object({
  object: z.string(),
  entry: z.array(z.looseObject({ id: z.string(), changes: z.array(z.unknown()).optional(), messaging: z.array(z.unknown()).optional() })),
});

const whatsappChange = z.object({
  field: z.literal('messages'),
  value: z.looseObject({
    metadata: z.looseObject({ phone_number_id: z.string() }),
    contacts: z.array(z.looseObject({ wa_id: z.string(), profile: z.looseObject({ name: z.string().optional() }).optional() })).optional(),
    messages: z.array(z.unknown()).optional(),
    statuses: z.array(z.unknown()).optional(),
  }),
});
const whatsappMessage = z.looseObject({
  id: z.string(),
  from: z.string(),
  timestamp: z.string(),
  type: z.string(),
  text: z.looseObject({ body: z.string() }).optional(),
});
const whatsappStatus = z.looseObject({ id: z.string(), status: z.string(), timestamp: z.string() });

const messagingItem = z.looseObject({
  sender: z.looseObject({ id: z.string() }),
  timestamp: z.number(),
  message: z
    .looseObject({
      mid: z.string(),
      text: z.string().optional(),
      is_echo: z.boolean().optional(),
      attachments: z.array(z.looseObject({ type: z.string() })).optional(),
    })
    .optional(),
});

const isoFromSeconds = (s: string) => new Date(Number(s) * 1000).toISOString();

// Never throws: a delivery we cannot read must still be acknowledged (Meta would retry it forever).
// Anything unsupported (reactions, typing, delivery receipts of other channels...) is skipped.
export function parseMetaPayload(body: unknown): MetaEvent[] {
  const parsed = envelope.safeParse(body);
  const channel = parsed.success ? CHANNEL_BY_OBJECT[parsed.data.object] : undefined;
  if (!parsed.success || !channel) return [];

  const events: MetaEvent[] = [];
  for (const entry of parsed.data.entry) {
    if (channel === 'whatsapp') {
      for (const raw of entry.changes ?? []) {
        const change = whatsappChange.safeParse(raw);
        if (!change.success) continue;
        const { metadata, contacts, messages, statuses } = change.data.value;
        const accountId = metadata.phone_number_id;
        const names = new Map(contacts?.map((c) => [c.wa_id, c.profile?.name]));

        for (const m of messages ?? []) {
          const msg = whatsappMessage.safeParse(m);
          if (!msg.success) continue;
          const { id, from, type, text, timestamp } = msg.data;
          events.push({
            key: `whatsapp:message:${id}`,
            channel,
            accountId,
            kind: 'message',
            message: { id, from, name: names.get(from), type, text: text?.body, at: isoFromSeconds(timestamp) },
          });
        }
        for (const s of statuses ?? []) {
          const st = whatsappStatus.safeParse(s);
          if (!st.success || !STATUS_VALUES.includes(st.data.status)) continue;
          const value = st.data.status as StatusValue;
          events.push({
            key: `whatsapp:status:${st.data.id}:${value}`,
            channel,
            accountId,
            kind: 'status',
            status: { id: st.data.id, value, at: isoFromSeconds(st.data.timestamp) },
          });
        }
      }
      continue;
    }

    // Messenger and Instagram share the "messaging" shape; entry.id is the Page / Instagram account.
    for (const raw of entry.messaging ?? []) {
      const item = messagingItem.safeParse(raw);
      if (!item.success || !item.data.message || item.data.message.is_echo) continue;
      const { sender, timestamp, message } = item.data;
      events.push({
        key: `${channel}:message:${message.mid}`,
        channel,
        accountId: entry.id,
        kind: 'message',
        message: {
          id: message.mid,
          from: sender.id,
          type: message.text !== undefined ? 'text' : (message.attachments?.[0]?.type ?? 'unsupported'),
          text: message.text,
          at: new Date(timestamp).toISOString(),
        },
      });
    }
  }
  return events;
}
