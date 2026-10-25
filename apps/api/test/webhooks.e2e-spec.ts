import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHmac, randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { vi } from 'vitest';

const SECRET = vi.hoisted(() => {
  // Must be set before AppModule is imported: ConfigModule reads the environment at import time.
  const secret = 'test-app-secret-0123456789abcdef';
  process.env.META_APP_ID = '123456789';
  process.env.META_APP_SECRET = secret;
  process.env.META_WEBHOOK_VERIFY_TOKEN = 'test-verify-token-0123456789';
  return secret;
});
const VERIFY = 'test-verify-token-0123456789';

import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/app.setup.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Meta webhooks (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const run = randomUUID().slice(0, 8);
  const orgA = `whA-${run}`;
  const orgB = `whB-${run}`;
  const phoneA = `1${run.replace(/\D/g, '1')}01`;
  const phoneB = `1${run.replace(/\D/g, '1')}02`;
  const customer = '8801711000000';
  const ids = { chanA: '', chanB: '' };
  let seq = 0;

  const http = () => request(app.getHttpServer());
  const sign = (body: string, secret = SECRET) => `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
  const post = (payload: object, signature?: string) => {
    const body = JSON.stringify(payload);
    return http().post('/api/v1/webhooks/meta').set('content-type', 'application/json').set('x-hub-signature-256', signature ?? sign(body)).send(body);
  };
  const waMessage = (phone: string, id: string, text: string) => ({
    object: 'whatsapp_business_account',
    entry: [{ id: 'waba', changes: [{ field: 'messages', value: {
      metadata: { phone_number_id: phone },
      contacts: [{ wa_id: customer, profile: { name: 'Rafi' } }],
      messages: [{ id, from: customer, timestamp: String(1_700_000_000 + ++seq), type: 'text', text: { body: text } }],
    } }] }],
  });
  const waStatus = (phone: string, id: string, status: string) => ({
    object: 'whatsapp_business_account',
    entry: [{ id: 'waba', changes: [{ field: 'messages', value: { metadata: { phone_number_id: phone }, statuses: [{ id, status, timestamp: String(1_700_000_000 + ++seq) }] } }] }],
  });
  const waitFor = async <T>(fn: () => Promise<T | null | undefined | false>, ms = 15_000): Promise<T> => {
    const end = Date.now() + ms;
    for (;;) {
      const v = await fn();
      if (v) return v;
      if (Date.now() > end) throw new Error('timed out waiting for the webhook worker');
      await new Promise((r) => setTimeout(r, 150));
    }
  };
  const eventFor = (id: string) => prisma.webhookEvent.findFirst({ where: { externalEventKey: { contains: id } } });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ bodyParser: false });
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    for (const id of [orgA, orgB]) await prisma.organization.create({ data: { id, name: id, slug: id.toLowerCase(), status: 'active' } });
    const token = Buffer.from('sealed');
    const mk = (tenantId: string, ext: string) =>
      prisma.channelAccount.create({ data: { tenantId, type: 'whatsapp', externalAccountId: ext, status: 'active', encryptedAccessToken: token, tokenKeyVersion: 'v1' } });
    ids.chanA = (await mk(orgA, phoneA)).id;
    ids.chanB = (await mk(orgB, phoneB)).id;
  });

  afterAll(async () => {
    await prisma.webhookEvent.deleteMany({ where: { externalEventKey: { contains: run } } });
    await prisma.channelAccount.deleteMany({ where: { externalAccountId: { startsWith: `1${run.replace(/\D/g, '1')}` } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgA, orgB] } } });
    await app.close();
  });

  describe('verification handshake', () => {
    const verify = (q: Record<string, string>) => http().get('/api/v1/webhooks/meta').query(q);

    it('echoes the challenge for the right token only', async () => {
      const res = await verify({ 'hub.mode': 'subscribe', 'hub.verify_token': VERIFY, 'hub.challenge': '1158201444' }).expect(200);
      expect(res.text).toBe('1158201444');
      expect(res.headers['content-type']).toMatch(/text\/plain/);
      await verify({ 'hub.mode': 'subscribe', 'hub.verify_token': 'wrong', 'hub.challenge': '1' }).expect(404);
      await verify({ 'hub.mode': 'subscribe', 'hub.challenge': '1' }).expect(404);
      await verify({ 'hub.mode': 'subscribe', 'hub.verify_token': VERIFY, 'hub.challenge': '<script>' }).expect(404);
    });
  });

  describe('signature check', () => {
    it('rejects missing, malformed, wrong-secret and tampered signatures, storing nothing', async () => {
      const id = `wamid.${run}.sig`;
      const payload = waMessage(phoneA, id, 'hi');
      const body = JSON.stringify(payload);
      await http().post('/api/v1/webhooks/meta').set('content-type', 'application/json').send(body).expect(401);
      await post(payload, 'sha256=nothex').expect(401);
      await post(payload, sign(body, 'some-other-secret-0123456789abcdef')).expect(401);
      // Valid signature for a different body.
      await post(payload, sign(JSON.stringify(waMessage(phoneA, id, 'other')))).expect(401);
      expect(await eventFor(id)).toBeNull();
    });

    it('acknowledges a signed body it cannot use, without storing anything', async () => {
      await post({}).expect(200);
      await post({ object: 'page', entry: 'nope' }).expect(200);
    });
  });

  describe('inbound messages', () => {
    it('stores the message once, builds contact + conversation, and clears the event payload', async () => {
      const id = `wamid.${run}.one`;
      await post(waMessage(phoneA, id, 'Hello Unibox')).expect(200);

      const message = await waitFor(() => prisma.message.findFirst({ where: { externalMessageId: id } }));
      expect(message).toMatchObject({ tenantId: orgA, channelAccountId: ids.chanA, direction: 'inbound', status: 'received', text: 'Hello Unibox' });
      const conv = await prisma.conversation.findFirstOrThrow({ where: { id: message.conversationId }, include: { contact: true } });
      expect(conv).toMatchObject({ tenantId: orgA, unreadCount: 1, status: 'open', lastMessagePreview: 'Hello Unibox' });
      expect(conv.contact).toMatchObject({ displayName: 'Rafi', phoneE164: `+${customer}` });
      expect(conv.lastInboundAt).not.toBeNull();

      const event = await waitFor(async () => {
        const e = await eventFor(id);
        return e?.status === 'succeeded' ? e : null;
      });
      expect(event.payload).toBeNull();
      expect(event.payloadDigest).toHaveLength(64);
    });

    it('dedupes redelivery: same event twice means one message and one event row', async () => {
      const id = `wamid.${run}.dup`;
      await post(waMessage(phoneA, id, 'once')).expect(200);
      await waitFor(() => prisma.message.findFirst({ where: { externalMessageId: id } }));
      const again = waMessage(phoneA, id, 'once');
      await post(again).expect(200);
      await post(again).expect(200);
      await new Promise((r) => setTimeout(r, 500));
      expect(await prisma.message.count({ where: { externalMessageId: id } })).toBe(1);
      expect(await prisma.webhookEvent.count({ where: { externalEventKey: { contains: id } } })).toBe(1);
    });

    it('keeps tenants apart: a message to B\'s number never lands in A', async () => {
      const id = `wamid.${run}.iso`;
      await post(waMessage(phoneB, id, 'for B')).expect(200);
      const message = await waitFor(() => prisma.message.findFirst({ where: { externalMessageId: id } }));
      expect(message.tenantId).toBe(orgB);
      expect(message.channelAccountId).toBe(ids.chanB);
      // Same customer number, but a separate contact and conversation per tenant.
      const convs = await prisma.conversation.findMany({ where: { externalConversationId: customer, tenantId: { in: [orgA, orgB] } } });
      expect(new Set(convs.map((c) => c.tenantId)).size).toBe(convs.length);
    });

    it('drops events for a disabled channel without storing the message', async () => {
      const disabled = `${phoneA}9`;
      await prisma.channelAccount.create({ data: { tenantId: orgA, type: 'whatsapp', externalAccountId: disabled, status: 'disabled' } });
      const id = `wamid.${run}.off`;
      await post(waMessage(disabled, id, 'ignored')).expect(200);
      const event = await waitFor(async () => {
        const e = await eventFor(id);
        return e?.status === 'succeeded' ? e : null;
      });
      expect(event.lastErrorCode).toBe('ACCOUNT_INACTIVE');
      expect(await prisma.message.count({ where: { externalMessageId: id } })).toBe(0);
    });

    it('retries an event for a channel that is connected a moment later', async () => {
      const late = `${phoneA}8`;
      const id = `wamid.${run}.late`;
      await post(waMessage(late, id, 'early bird')).expect(200);
      expect((await eventFor(id))?.channelAccountId).toBeNull();
      await prisma.channelAccount.create({
        data: { tenantId: orgA, type: 'whatsapp', externalAccountId: late, status: 'active', encryptedAccessToken: Buffer.from('s'), tokenKeyVersion: 'v1' },
      });
      const message = await waitFor(() => prisma.message.findFirst({ where: { externalMessageId: id } }));
      expect(message.tenantId).toBe(orgA);
    });
  });

  describe('delivery statuses', () => {
    it('moves an outbound message forward only, whatever order the updates arrive in', async () => {
      const wamid = `wamid.${run}.out`;
      const conv = await prisma.conversation.findFirstOrThrow({ where: { tenantId: orgA, channelAccountId: ids.chanA } });
      const out = await prisma.message.create({
        data: { tenantId: orgA, conversationId: conv.id, channelAccountId: ids.chanA, externalMessageId: wamid, direction: 'outbound', status: 'sent', messageType: 'text', text: 'reply' },
      });
      const statusOf = async () => (await prisma.message.findUniqueOrThrow({ where: { id: out.id } })).status;

      await post(waStatus(phoneA, wamid, 'read')).expect(200);
      await waitFor(async () => (await statusOf()) === 'read');
      // Late "delivered" must not move it back.
      await post(waStatus(phoneA, wamid, 'delivered')).expect(200);
      await waitFor(async () => (await prisma.webhookEvent.findFirst({ where: { externalEventKey: `whatsapp:status:${wamid}:delivered`, status: 'succeeded' } })) != null);
      expect(await statusOf()).toBe('read');
    });

    it('records a status for an unknown message as handled, not failed', async () => {
      const wamid = `wamid.${run}.ghost`;
      await post(waStatus(phoneA, wamid, 'delivered')).expect(200);
      const event = await waitFor(async () => {
        const e = await eventFor(wamid);
        return e?.status === 'succeeded' ? e : null;
      });
      expect(event.lastErrorCode).toBe('MESSAGE_NOT_FOUND');
    });
  });
});
