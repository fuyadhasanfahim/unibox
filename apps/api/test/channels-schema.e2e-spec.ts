import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { TenantPrismaService } from '../src/prisma/tenant-prisma.service.js';

// The channel tables must keep tenants apart even if application code gets it wrong.
describe('Channel schema isolation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenants: TenantPrismaService;
  const run = randomUUID().slice(0, 8);
  const a = `chA-${run}`;
  const b = `chB-${run}`;
  const ids = { chanA: '', chanB: '', contactA: '', convA: '' };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    tenants = app.get(TenantPrismaService);

    for (const id of [a, b]) await prisma.organization.create({ data: { id, name: id, slug: id.toLowerCase(), status: 'active' } });
    const token = Buffer.from('sealed');
    ids.chanA = (await prisma.channelAccount.create({ data: { tenantId: a, type: 'whatsapp', externalAccountId: `wa-${run}-1`, status: 'active', encryptedAccessToken: token, tokenKeyVersion: 'v1' } })).id;
    ids.chanB = (await prisma.channelAccount.create({ data: { tenantId: b, type: 'whatsapp', externalAccountId: `wa-${run}-2`, status: 'active', encryptedAccessToken: token, tokenKeyVersion: 'v1' } })).id;
    ids.contactA = (await prisma.contact.create({ data: { tenantId: a, displayName: 'Customer A' } })).id;
    ids.convA = (await prisma.conversation.create({ data: { tenantId: a, channelAccountId: ids.chanA, contactId: ids.contactA, externalConversationId: 'c1' } })).id;
  });

  afterAll(async () => {
    await prisma.organization.deleteMany({ where: { id: { in: [a, b] } } });
    await app.close();
  });

  it('the tenant client only sees its own channel accounts and conversations', async () => {
    expect(await tenants.forTenant(a).channelAccount.findMany()).toHaveLength(1);
    expect(await tenants.forTenant(b).conversation.findMany()).toHaveLength(0);
    expect(await tenants.forTenant(b).channelAccount.findFirst({ where: { id: ids.chanA } })).toBeNull();
  });

  it('a provider account can belong to one tenant only', async () => {
    await expect(
      prisma.channelAccount.create({ data: { tenantId: b, type: 'whatsapp', externalAccountId: `wa-${run}-1` } }),
    ).rejects.toThrow();
  });

  it('the database rejects rows that point at another tenant\'s parent', async () => {
    await expect(
      prisma.conversation.create({ data: { tenantId: b, channelAccountId: ids.chanA, contactId: ids.contactA, externalConversationId: 'x' } }),
    ).rejects.toThrow();
    await expect(
      prisma.message.create({ data: { tenantId: b, conversationId: ids.convA, channelAccountId: ids.chanB, direction: 'inbound', status: 'received', messageType: 'text' } }),
    ).rejects.toThrow();
    await expect(
      prisma.message.create({ data: { tenantId: a, conversationId: ids.convA, channelAccountId: ids.chanB, direction: 'inbound', status: 'received', messageType: 'text' } }),
    ).rejects.toThrow();
  });

  it('CHECK constraints reject unknown values and active accounts without a token', async () => {
    await expect(prisma.channelAccount.create({ data: { tenantId: a, type: 'sms', externalAccountId: `x-${run}` } })).rejects.toThrow();
    await expect(
      prisma.channelAccount.create({ data: { tenantId: a, type: 'messenger', externalAccountId: `y-${run}`, status: 'active' } }),
    ).rejects.toThrow();
    await expect(
      prisma.message.create({ data: { tenantId: a, conversationId: ids.convA, channelAccountId: ids.chanA, direction: 'sideways', status: 'received', messageType: 'text' } }),
    ).rejects.toThrow();
  });

  it('deleting a tenant removes its channel data', async () => {
    await prisma.organization.delete({ where: { id: a } });
    expect(await prisma.conversation.count({ where: { tenantId: a } })).toBe(0);
    expect(await prisma.channelAccount.count({ where: { tenantId: a } })).toBe(0);
  });
});
