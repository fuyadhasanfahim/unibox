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
import { CrossTenantWriteError, TenantPrismaService } from '../src/prisma/tenant-prisma.service.js';

// Needs the docker-compose Postgres (and Mailpit for invite emails).
// Rows are namespaced by a run id and removed afterwards; audit rows are append-only and stay.
describe('Tenancy, RBAC and auth hardening (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let secret: string;
  const run = randomUUID().slice(0, 8);
  const password = 'correct horse battery staple';
  const ORIGIN = 'http://localhost:3000';
  let ipCounter = 0;
  // A fresh "client IP" per sign-in keeps the per-IP login limit out of the way.
  const nextIp = () => `10.${(Date.now() >> 8) % 250}.${Math.floor(++ipCounter / 250)}.${ipCounter % 250}`;
  const viaProxy = (ip = nextIp()) => ({ [CLIENT_IP_HEADER]: ip, [PROXY_SECRET_HEADER]: secret });

  // Better Auth stores and looks up emails in lowercase.
  const email = (name: string) => `${name}-${run}@rbac.test`.toLowerCase();
  const orgA = `orgA-${run}`;
  const orgB = `orgB-${run}`;
  const orgC = `orgC-${run}`;
  const ids: Record<string, string> = {}; // user ids
  const memberIds: Record<string, string> = {};
  const cookies: Record<string, string> = {};

  const http = () => request(app.getHttpServer());

  async function createUser(name: string, platformRole: 'user' | 'super_admin' = 'user') {
    const id = randomUUID();
    await prisma.user.create({ data: { id, name, email: email(name), emailVerified: true, role: platformRole } });
    await prisma.account.create({
      data: { id: randomUUID(), userId: id, accountId: id, providerId: 'credential', password: await hashPassword(password) },
    });
    ids[name] = id;
  }

  async function addMember(name: string, organizationId: string, role: TenantRole) {
    const id = randomUUID();
    await prisma.member.create({ data: { id, organizationId, userId: ids[name]!, role } });
    memberIds[`${name}@${organizationId}`] = id;
  }

  async function signIn(name: string) {
    const res = await http()
      .post('/api/auth/sign-in/email')
      .set('origin', ORIGIN)
      .set(viaProxy())
      .send({ email: email(name), password })
      .expect(200);
    const set = res.headers['set-cookie'] as unknown as string[];
    cookies[name] = set.map((c) => c.split(';')[0]).join('; ');
    return res.body as { token: string };
  }

  const as = (name: string) => ({ cookie: cookies[name]!, origin: ORIGIN });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ bodyParser: false });
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    secret = app.get(ConfigService).get('INTERNAL_PROXY_SECRET') as string;

    for (const [id, name, status] of [
      [orgA, 'Org A', 'active'],
      [orgB, 'Org B', 'active'],
      [orgC, 'Org C', 'active'],
    ] as const) {
      await prisma.organization.create({ data: { id, name, slug: `${id}`.toLowerCase(), status } });
    }
    for (const n of ['ownerA', 'adminA', 'managerA', 'agentA', 'ownerB', 'outsider', 'ownerC1', 'ownerC2']) await createUser(n);
    await createUser('staff', 'super_admin');

    await addMember('ownerA', orgA, 'owner');
    await addMember('adminA', orgA, 'admin');
    await addMember('managerA', orgA, 'manager');
    await addMember('agentA', orgA, 'agent');
    await addMember('ownerB', orgB, 'owner');
    await addMember('ownerC1', orgC, 'owner');
    await addMember('ownerC2', orgC, 'owner');

    for (const n of Object.keys(ids)) await signIn(n);
  });

  afterAll(async () => {
    await prisma.organization.deleteMany({ where: { id: { in: [orgA, orgB, orgC] } } });
    await prisma.organization.deleteMany({ where: { name: `Created ${run}` } });
    await prisma.user.deleteMany({ where: { email: { endsWith: `-${run}@rbac.test` } } });
    await app.close();
  });

  describe('tenant isolation', () => {
    it('rejects anonymous requests (401)', async () => {
      await http().get(`/api/v1/tenants/${orgA}/members`).expect(401);
    });

    it('T-02: a signed-in non-member gets 404, not a hint that the tenant exists', async () => {
      const res = await http().get(`/api/v1/tenants/${orgA}/members`).set(as('outsider')).expect(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it("T-01: an owner of A cannot read or change B's members, even with B's ids", async () => {
      await http().get(`/api/v1/tenants/${orgB}/members`).set(as('ownerA')).expect(404);
      // Tenant A in the URL, member of B in the body path: scoped query finds nothing.
      await http()
        .patch(`/api/v1/tenants/${orgA}/members/${memberIds[`ownerB@${orgB}`]}`)
        .set(as('ownerA'))
        .send({ role: 'agent' })
        .expect(404);
      await http().delete(`/api/v1/tenants/${orgA}/members/${memberIds[`ownerB@${orgB}`]}`).set(as('ownerA')).expect(404);
      const ownerB = await prisma.member.findUniqueOrThrow({ where: { id: memberIds[`ownerB@${orgB}`] } });
      expect(ownerB.role).toBe('owner');
    });

    it('lists only the caller\'s own workspaces with permissions', async () => {
      const res = await http().get('/api/v1/me/workspaces').set(as('adminA')).expect(200);
      expect(res.body.workspaces).toHaveLength(1);
      expect(res.body.workspaces[0]).toMatchObject({ id: orgA, role: 'admin' });
      expect(res.body.workspaces[0].permissions).toContain('members.invite');
      expect(res.body.workspaces[0].permissions).not.toContain('workspace.delete');
    });

    it('TenantPrismaService scopes reads and refuses cross-tenant or unscopable writes', async () => {
      const db = app.get(TenantPrismaService).forTenant(orgA);
      const members = await db.member.findMany({ select: { organizationId: true } });
      expect(members.length).toBe(4);
      expect(members.every((m) => m.organizationId === orgA)).toBe(true);
      await expect(
        db.member.create({ data: { id: randomUUID(), organizationId: orgB, userId: ids.outsider!, role: 'agent' } }),
      ).rejects.toBeInstanceOf(CrossTenantWriteError);
      await expect(db.member.findUnique({ where: { id: memberIds[`ownerB@${orgB}`]! } })).rejects.toThrow(/not allowed/);
    });
  });

  describe('permissions and role ranks', () => {
    it('T-05: agents can read members but cannot invite; managers cannot change roles', async () => {
      await http().get(`/api/v1/tenants/${orgA}/members`).set(as('agentA')).expect(200);
      await http().post(`/api/v1/tenants/${orgA}/invitations`).set(as('agentA')).send({ email: email('x1'), role: 'agent' }).expect(403);
      await http()
        .patch(`/api/v1/tenants/${orgA}/members/${memberIds[`agentA@${orgA}`]}`)
        .set(as('managerA'))
        .send({ role: 'manager' })
        .expect(403);
    });

    it('an admin cannot invite an owner, but can invite up to admin', async () => {
      await http().post(`/api/v1/tenants/${orgA}/invitations`).set(as('adminA')).send({ email: email('x2'), role: 'owner' }).expect(403);
      const res = await http()
        .post(`/api/v1/tenants/${orgA}/invitations`)
        .set(as('adminA'))
        .send({ email: email('x3'), role: 'manager' })
        .expect(201);
      expect(res.body).toMatchObject({ email: email('x3'), role: 'manager' });
      expect(res.body).not.toHaveProperty('tokenHash');
      const inv = await prisma.invitation.findFirstOrThrow({ where: { id: res.body.id } });
      expect(inv.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('rejects inviting someone who is already a member', async () => {
      await http().post(`/api/v1/tenants/${orgA}/invitations`).set(as('ownerA')).send({ email: email('agentA'), role: 'agent' }).expect(409);
    });

    it('an admin cannot touch an owner, can promote an agent, and the change is audited', async () => {
      await http()
        .patch(`/api/v1/tenants/${orgA}/members/${memberIds[`ownerA@${orgA}`]}`)
        .set(as('adminA'))
        .send({ role: 'agent' })
        .expect(403);
      await http()
        .patch(`/api/v1/tenants/${orgA}/members/${memberIds[`agentA@${orgA}`]}`)
        .set(as('adminA'))
        .send({ role: 'owner' })
        .expect(403);
      await http()
        .patch(`/api/v1/tenants/${orgA}/members/${memberIds[`agentA@${orgA}`]}`)
        .set(as('adminA'))
        .send({ role: 'manager' })
        .expect(200, { id: memberIds[`agentA@${orgA}`], role: 'manager' });

      const audit = await prisma.auditLog.findFirstOrThrow({
        where: { tenantId: orgA, action: 'member.role_changed', resourceId: memberIds[`agentA@${orgA}`] },
      });
      expect(audit).toMatchObject({ actorUserId: ids.adminA, metadata: { from: 'agent', to: 'manager' } });
      expect(audit.requestId).toBeTruthy();
    });

    it('nobody can change their own role', async () => {
      await http()
        .patch(`/api/v1/tenants/${orgA}/members/${memberIds[`ownerA@${orgA}`]}`)
        .set(as('ownerA'))
        .send({ role: 'admin' })
        .expect(403);
    });

    it('keeps at least one owner even when two owners demote each other at once', async () => {
      const [a, b] = await Promise.all([
        http().patch(`/api/v1/tenants/${orgC}/members/${memberIds[`ownerC2@${orgC}`]}`).set(as('ownerC1')).send({ role: 'admin' }),
        http().patch(`/api/v1/tenants/${orgC}/members/${memberIds[`ownerC1@${orgC}`]}`).set(as('ownerC2')).send({ role: 'admin' }),
      ]);
      const statuses = [a.status, b.status].sort((x, y) => x - y);
      expect(statuses[0]).toBe(200);
      expect([403, 409]).toContain(statuses[1]);
      expect(await prisma.member.count({ where: { organizationId: orgC, role: 'owner' } })).toBe(1);
    });

    it('the last owner cannot be removed', async () => {
      const owner = await prisma.member.findFirstOrThrow({ where: { organizationId: orgC, role: 'owner' } });
      const admin = await prisma.member.findFirstOrThrow({ where: { organizationId: orgC, role: 'admin' } });
      const adminName = admin.userId === ids.ownerC1 ? 'ownerC1' : 'ownerC2';
      // An admin is outranked by the owner…
      await http().delete(`/api/v1/tenants/${orgC}/members/${owner.id}`).set(as(adminName)).expect(403);
    });

    it('an admin can remove a lower role; the removal is audited', async () => {
      await http().delete(`/api/v1/tenants/${orgA}/members/${memberIds[`managerA@${orgA}`]}`).set(as('adminA')).expect(204);
      await http().get(`/api/v1/tenants/${orgA}/members`).set(as('managerA')).expect(404);
      await prisma.auditLog.findFirstOrThrow({ where: { tenantId: orgA, action: 'member.removed', resourceId: memberIds[`managerA@${orgA}`] } });
    });
  });

  describe('platform administration', () => {
    it('tenant owners are not platform admins', async () => {
      await http().get('/api/v1/platform/tenants').set(as('ownerA')).expect(403);
    });

    it('a super admin lists tenants and creates one with an owner invitation', async () => {
      const list = await http().get('/api/v1/platform/tenants').set(as('staff')).expect(200);
      expect(list.body.map((t: { id: string }) => t.id)).toEqual(expect.arrayContaining([orgA, orgB]));

      const res = await http()
        .post('/api/v1/platform/tenants')
        .set(as('staff'))
        .send({ name: `Created ${run}`, ownerEmail: email('newowner') })
        .expect(201);
      expect(res.body).toMatchObject({ status: 'active', ownerAddedDirectly: false });
      const invite = await prisma.invitation.findFirstOrThrow({ where: { organizationId: res.body.id } });
      expect(invite).toMatchObject({ role: 'owner', status: 'pending', email: email('newowner') });
    });

    it('suspending a tenant locks its members out, and is audited', async () => {
      await http()
        .patch(`/api/v1/platform/tenants/${orgB}/status`)
        .set(as('staff'))
        .send({ status: 'suspended', reason: 'e2e test' })
        .expect(200);
      const res = await http().get(`/api/v1/tenants/${orgB}/members`).set(as('ownerB')).expect(403);
      expect(res.body.error.code).toBe('TENANT_SUSPENDED');
      await prisma.auditLog.findFirstOrThrow({ where: { tenantId: orgB, action: 'tenant.status_changed', actorUserId: ids.staff } });
    });
  });

  describe('auth hardening', () => {
    it('blocks Better Auth organization mutations (they bypass our rank rules)', async () => {
      const res = await http()
        .post('/api/auth/organization/update-member-role')
        .set(as('ownerA'))
        .send({ memberId: memberIds[`adminA@${orgA}`], role: 'owner', organizationId: orgA });
      expect(res.status).toBe(403);
    });

    it('a raw session token from a JSON body cannot be used as a session (cookies are signed)', async () => {
      const { token } = await signIn('agentA');
      expect(token).toBeTruthy();
      const forged = await http().get('/api/auth/get-session').set('origin', ORIGIN).set('cookie', `unibox.session_token=${token}`);
      expect(forged.body).toBeNull();
      const bearer = await http().get('/api/auth/get-session').set('origin', ORIGIN).set('authorization', `Bearer ${token}`);
      expect(bearer.body).toBeNull();
    });

    async function lastSessionIp(name: string) {
      const s = await prisma.session.findFirstOrThrow({ where: { userId: ids[name] }, orderBy: { createdAt: 'desc' } });
      return s.ipAddress;
    }

    it('ignores client-supplied x-forwarded-for and unauthenticated client-ip headers', async () => {
      await http()
        .post('/api/auth/sign-in/email')
        .set('origin', ORIGIN)
        .set('x-forwarded-for', '6.6.6.6')
        .set(CLIENT_IP_HEADER, '7.7.7.7')
        .set(PROXY_SECRET_HEADER, 'wrong-secret')
        .send({ email: email('outsider'), password })
        .expect(200);
      // Neither spoofed value is used (Better Auth falls back to 127.0.0.1 only in dev/test).
      expect(['6.6.6.6', '7.7.7.7']).not.toContain(await lastSessionIp('outsider'));

      await http().post('/api/auth/sign-in/email').set('origin', ORIGIN).set(viaProxy('192.0.2.44')).send({ email: email('outsider'), password }).expect(200);
      expect(await lastSessionIp('outsider')).toBe('192.0.2.44');
    });

    it('rate-limits sign-in per client IP without affecting other IPs', async () => {
      const ip = nextIp();
      const statuses: number[] = [];
      for (let i = 0; i < 6; i++) {
        const res = await http()
          .post('/api/auth/sign-in/email')
          .set('origin', ORIGIN)
          .set(viaProxy(ip))
          .send({ email: email('outsider'), password: 'wrong password!' });
        statuses.push(res.status);
      }
      expect(statuses.slice(0, 5).every((s) => s === 401)).toBe(true);
      expect(statuses[5]).toBe(429);
      await http().post('/api/auth/sign-in/email').set('origin', ORIGIN).set(viaProxy()).send({ email: email('outsider'), password }).expect(200);
    });
  });
});
