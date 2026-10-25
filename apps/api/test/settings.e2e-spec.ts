import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TenantRole } from '@repo/shared';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/app.setup.js';
import { hashPassword } from '../src/auth/password.js';
import { CLIENT_IP_HEADER, PROXY_SECRET_HEADER } from '../src/common/client-ip.middleware.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Workspace settings, leaving, ownership transfer and password change.
describe('Settings (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let secret: string;
  const run = randomUUID().slice(0, 8);
  const password = 'correct horse battery staple';
  const ORIGIN = 'http://localhost:3000';
  const email = (n: string) => `${n}-${run}@settings.test`.toLowerCase();
  const org = `orgS-${run}`;
  const ids: Record<string, string> = {};
  const memberIds: Record<string, string> = {};
  const cookies: Record<string, string> = {};
  let ip = 0;

  const http = () => request(app.getHttpServer());
  const as = (n: string) => ({ cookie: cookies[n]!, origin: ORIGIN });
  const viaProxy = () => ({ [CLIENT_IP_HEADER]: `10.88.${Math.floor(++ip / 250)}.${ip % 250}`, [PROXY_SECRET_HEADER]: secret });

  function signIn(name: string, pw = password) {
    return http().post('/api/auth/sign-in/email').set('origin', ORIGIN).set(viaProxy()).send({ email: email(name), password: pw });
  }

  async function createMember(name: string, role: TenantRole) {
    const id = randomUUID();
    await prisma.user.create({ data: { id, name, email: email(name), emailVerified: true } });
    await prisma.account.create({
      data: { id: randomUUID(), userId: id, accountId: id, providerId: 'credential', password: await hashPassword(password) },
    });
    ids[name] = id;
    memberIds[name] = randomUUID();
    await prisma.member.create({ data: { id: memberIds[name], organizationId: org, userId: id, role } });
    const res = await signIn(name).expect(200);
    cookies[name] = (res.headers['set-cookie'] as unknown as string[]).map((c) => c.split(';')[0]).join('; ');
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ bodyParser: false });
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    secret = app.get(ConfigService).get('INTERNAL_PROXY_SECRET') as string;

    await prisma.organization.create({ data: { id: org, name: 'Settings Org', slug: org.toLowerCase(), status: 'active' } });
    await createMember('owner', 'owner');
    await createMember('admin', 'admin');
    await createMember('manager', 'manager');
    await createMember('agent', 'agent');
    await createMember('pw', 'agent');
  });

  afterAll(async () => {
    await prisma.organization.deleteMany({ where: { id: org } });
    await prisma.user.deleteMany({ where: { email: { endsWith: `-${run}@settings.test` } } });
    await app.close();
  });

  describe('workspace settings', () => {
    it('any member can read the workspace details', async () => {
      const res = await http().get(`/api/v1/tenants/${org}`).set(as('agent')).expect(200);
      expect(res.body).toMatchObject({ id: org, name: 'Settings Org', timeZone: 'UTC', defaultLocale: 'en' });
    });

    it('managers cannot change settings', async () => {
      await http().patch(`/api/v1/tenants/${org}`).set(as('manager')).send({ name: 'Nope' }).expect(403);
    });

    it('validates input: real IANA time zones only, no unknown fields, not empty', async () => {
      await http().patch(`/api/v1/tenants/${org}`).set(as('admin')).send({ timeZone: 'Mars/Phobos' }).expect(400);
      await http().patch(`/api/v1/tenants/${org}`).set(as('admin')).send({ status: 'closed' }).expect(400);
      await http().patch(`/api/v1/tenants/${org}`).set(as('admin')).send({}).expect(400);
    });

    it('admins update name and time zone; the change is audited with before/after', async () => {
      const res = await http()
        .patch(`/api/v1/tenants/${org}`)
        .set(as('admin'))
        .send({ name: 'Settings Org Renamed', timeZone: 'Asia/Dhaka' })
        .expect(200);
      expect(res.body).toMatchObject({ name: 'Settings Org Renamed', timeZone: 'Asia/Dhaka' });
      const audit = await prisma.auditLog.findFirstOrThrow({ where: { tenantId: org, action: 'workspace.updated' } });
      expect(audit.metadata).toMatchObject({ timeZone: { from: 'UTC', to: 'Asia/Dhaka' } });
    });
  });

  describe('ownership and leaving', () => {
    it('the only owner cannot leave', async () => {
      const res = await http().post(`/api/v1/tenants/${org}/leave`).set(as('owner')).expect(409);
      expect(res.body.error.code).toBe('LAST_OWNER');
    });

    it('only an owner can transfer ownership', async () => {
      await http().post(`/api/v1/tenants/${org}/transfer-ownership`).set(as('admin')).send({ memberId: memberIds.manager }).expect(403);
    });

    it('transfer makes the target owner and steps the old owner down to admin', async () => {
      await http().post(`/api/v1/tenants/${org}/transfer-ownership`).set(as('owner')).send({ memberId: memberIds.manager }).expect(200);
      const roles = Object.fromEntries(
        (await prisma.member.findMany({ where: { organizationId: org }, select: { id: true, role: true } })).map((m) => [m.id, m.role]),
      );
      expect(roles[memberIds.manager!]).toBe('owner');
      expect(roles[memberIds.owner!]).toBe('admin');
      await prisma.auditLog.findFirstOrThrow({ where: { tenantId: org, action: 'workspace.ownership_transferred', actorUserId: ids.owner } });
      // The previous owner is an admin now and can no longer transfer.
      await http().post(`/api/v1/tenants/${org}/transfer-ownership`).set(as('owner')).send({ memberId: memberIds.agent }).expect(403);
    });

    it('a member can leave; they lose access and it is audited', async () => {
      await http().post(`/api/v1/tenants/${org}/leave`).set(as('agent')).expect(204);
      await http().get(`/api/v1/tenants/${org}`).set(as('agent')).expect(404);
      await prisma.auditLog.findFirstOrThrow({ where: { tenantId: org, action: 'member.left', actorUserId: ids.agent } });
    });
  });

  describe('password change', () => {
    it('requires the current password, swaps credentials and is audited', async () => {
      const newPassword = 'a brand new passphrase 42';
      await http()
        .post('/api/auth/change-password')
        .set(as('pw'))
        .send({ currentPassword: 'not my password', newPassword, revokeOtherSessions: true })
        .expect((r) => expect(r.status).toBeGreaterThanOrEqual(400));
      await http()
        .post('/api/auth/change-password')
        .set(as('pw'))
        .send({ currentPassword: password, newPassword, revokeOtherSessions: true })
        .expect(200);

      expect((await signIn('pw')).status).toBe(401);
      expect((await signIn('pw', newPassword)).status).toBe(200);
      await prisma.auditLog.findFirstOrThrow({ where: { action: 'account.password_changed', actorUserId: ids.pw } });
    });

    it('rejects a new password shorter than the policy', async () => {
      const res = await http().post('/api/auth/change-password').set(as('admin')).send({ currentPassword: password, newPassword: 'short' });
      expect(res.status).toBe(400);
    });
  });
});
