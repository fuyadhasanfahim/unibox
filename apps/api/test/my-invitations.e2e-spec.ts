import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/app.setup.js';
import { hashPassword } from '../src/auth/password.js';
import { createToken } from '../src/auth/tokens.js';
import { CLIENT_IP_HEADER, PROXY_SECRET_HEADER } from '../src/common/client-ip.middleware.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Existing-account invitation flow: list, accept and decline by the invitee's own email.
describe('My invitations (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let secret: string;
  const run = randomUUID().slice(0, 8);
  const password = 'correct horse battery staple';
  const ORIGIN = 'http://localhost:3000';
  const email = (n: string) => `${n}-${run}@myinv.test`.toLowerCase();
  const orgX = `orgX-${run}`;
  const orgY = `orgY-${run}`;
  const ids: Record<string, string> = {};
  const cookies: Record<string, string> = {};
  let ip = 0;

  const http = () => request(app.getHttpServer());
  const as = (n: string) => ({ cookie: cookies[n]!, origin: ORIGIN });

  async function createUser(name: string, emailVerified = true) {
    const id = randomUUID();
    await prisma.user.create({ data: { id, name, email: email(name), emailVerified } });
    await prisma.account.create({
      data: { id: randomUUID(), userId: id, accountId: id, providerId: 'credential', password: await hashPassword(password) },
    });
    ids[name] = id;
    const res = await http()
      .post('/api/auth/sign-in/email')
      .set('origin', ORIGIN)
      .set({ [CLIENT_IP_HEADER]: `10.77.${Math.floor(++ip / 250)}.${ip % 250}`, [PROXY_SECRET_HEADER]: secret })
      .send({ email: email(name), password })
      .expect(200);
    cookies[name] = (res.headers['set-cookie'] as unknown as string[]).map((c) => c.split(';')[0]).join('; ');
  }

  async function invite(orgId: string, to: string, role = 'agent') {
    const token = createToken();
    const id = randomUUID();
    await prisma.invitation.create({
      data: {
        id,
        organizationId: orgId,
        email: to,
        role,
        status: 'pending',
        expiresAt: new Date(Date.now() + 3_600_000),
        inviterId: ids.ownerX!,
        tokenHash: token.hash,
      },
    });
    return { id, raw: token.raw };
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ bodyParser: false });
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    secret = app.get(ConfigService).get('INTERNAL_PROXY_SECRET') as string;

    await prisma.organization.create({ data: { id: orgX, name: 'Org X', slug: orgX.toLowerCase(), status: 'active' } });
    await prisma.organization.create({ data: { id: orgY, name: 'Org Y', slug: orgY.toLowerCase(), status: 'active' } });
    await createUser('ownerX');
    await prisma.member.create({ data: { id: randomUUID(), organizationId: orgX, userId: ids.ownerX!, role: 'owner' } });
    await createUser('existing');
    await createUser('stranger');
    await createUser('unverified', false);
  });

  afterAll(async () => {
    await prisma.organization.deleteMany({ where: { id: { in: [orgX, orgY] } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: `-${run}@myinv.test` } } });
    await app.close();
  });

  it('the invite-link preview tells an existing account to sign in instead', async () => {
    const { raw } = await invite(orgX, email('existing'));
    const res = await http().get('/api/v1/invites/lookup').query({ token: raw }).expect(200);
    expect(res.body).toMatchObject({ email: email('existing'), accountExists: true });
  });

  it('lists only invitations addressed to my own email', async () => {
    const mine = await http().get('/api/v1/me/invitations').set(as('existing')).expect(200);
    expect(mine.body.map((i: { workspaceId: string }) => i.workspaceId)).toContain(orgX);
    const theirs = await http().get('/api/v1/me/invitations').set(as('stranger')).expect(200);
    expect(theirs.body).toEqual([]);
  });

  it("cannot accept someone else's invitation by id", async () => {
    const { id } = await invite(orgY, email('existing'));
    await http().post(`/api/v1/me/invitations/${id}/accept`).set(as('stranger')).expect(404);
    expect(await prisma.member.count({ where: { organizationId: orgY, userId: ids.stranger } })).toBe(0);
  });

  it('accepts once, joins with the invited role, and is audited', async () => {
    const { id } = await invite(orgY, email('existing'), 'manager');
    const res = await http().post(`/api/v1/me/invitations/${id}/accept`).set(as('existing')).expect(200);
    expect(res.body).toEqual({ workspaceId: orgY, workspaceName: 'Org Y', role: 'manager' });
    await http().post(`/api/v1/me/invitations/${id}/accept`).set(as('existing')).expect(404);

    const member = await prisma.member.findUniqueOrThrow({
      where: { organizationId_userId: { organizationId: orgY, userId: ids.existing! } },
    });
    expect(member.role).toBe('manager');
    await prisma.auditLog.findFirstOrThrow({ where: { tenantId: orgY, action: 'member.joined', actorUserId: ids.existing } });

    const ws = await http().get('/api/v1/me/workspaces').set(as('existing')).expect(200);
    expect(ws.body.workspaces.map((w: { id: string }) => w.id)).toContain(orgY);
  });

  it('accepting while already a member keeps the current role', async () => {
    const { id } = await invite(orgY, email('existing'), 'agent');
    const res = await http().post(`/api/v1/me/invitations/${id}/accept`).set(as('existing')).expect(200);
    expect(res.body.role).toBe('manager');
  });

  it('lets only one of several concurrent accepts win', async () => {
    const { id } = await invite(orgX, email('stranger'));
    const results = await Promise.all([1, 2, 3].map(() => http().post(`/api/v1/me/invitations/${id}/accept`).set(as('stranger'))));
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(await prisma.member.count({ where: { organizationId: orgX, userId: ids.stranger } })).toBe(1);
  });

  it('declines an invitation, after which it cannot be accepted', async () => {
    const { id } = await invite(orgX, email('existing'));
    await http().post(`/api/v1/me/invitations/${id}/decline`).set(as('existing')).expect(204);
    const inv = await prisma.invitation.findUniqueOrThrow({ where: { id } });
    expect(inv).toMatchObject({ status: 'rejected', tokenHash: null });
    await http().post(`/api/v1/me/invitations/${id}/accept`).set(as('existing')).expect(404);
  });

  it('an unverified email cannot see or accept invitations', async () => {
    const { id } = await invite(orgX, email('unverified'));
    const list = await http().get('/api/v1/me/invitations').set(as('unverified')).expect(200);
    expect(list.body).toEqual([]);
    await http().post(`/api/v1/me/invitations/${id}/accept`).set(as('unverified')).expect(403);
  });

  it('hides invitations to suspended workspaces', async () => {
    const { id } = await invite(orgY, email('stranger'));
    await prisma.organization.update({ where: { id: orgY }, data: { status: 'suspended' } });
    const list = await http().get('/api/v1/me/invitations').set(as('stranger')).expect(200);
    expect(list.body.map((i: { id: string }) => i.id)).not.toContain(id);
    await http().post(`/api/v1/me/invitations/${id}/accept`).set(as('stranger')).expect(404);
    await prisma.organization.update({ where: { id: orgY }, data: { status: 'active' } });
  });
});
