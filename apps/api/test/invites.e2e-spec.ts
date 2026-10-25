import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/app.setup.js';
import { createToken } from '../src/auth/tokens.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Needs the docker-compose Postgres. Every row uses a unique run id and is removed afterwards.
describe('Invite-only sign-up (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const run = randomUUID().slice(0, 8);
  const orgId = `org-test-${run}`;
  const ownerId = `owner-test-${run}`;
  const password = 'correct horse battery staple';

  async function invite(email: string, overrides: { expiresAt?: Date; status?: string } = {}) {
    const token = createToken();
    await prisma.invitation.create({
      data: {
        id: randomUUID(),
        organizationId: orgId,
        email,
        role: 'member',
        status: overrides.status ?? 'pending',
        expiresAt: overrides.expiresAt ?? new Date(Date.now() + 3_600_000),
        inviterId: ownerId,
        tokenHash: token.hash,
      },
    });
    return token.raw;
  }

  const accept = (token: string, name = 'Test User') =>
    request(app.getHttpServer()).post('/api/v1/invites/accept').send({ token, name, password });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ bodyParser: false });
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    await prisma.user.create({ data: { id: ownerId, name: 'Owner', email: `owner-${run}@test.local`, emailVerified: true } });
    await prisma.organization.create({ data: { id: orgId, name: 'Test Org', slug: `test-${run}`, status: 'active' } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: `-${run}@test.local` } } });
    await prisma.organization.deleteMany({ where: { id: orgId } });
    await app.close();
  });

  it('previews a valid invite without leaking internals', async () => {
    const token = await invite(`preview-${run}@test.local`);
    const res = await request(app.getHttpServer()).get('/api/v1/invites/lookup').query({ token }).expect(200);
    expect(res.body).toMatchObject({ email: `preview-${run}@test.local`, organizationName: 'Test Org', role: 'member' });
    expect(res.body).not.toHaveProperty('tokenHash');
  });

  it('accepts once: creates user, Argon2id credential and membership, then burns the token (T-03)', async () => {
    const email = `accept-${run}@test.local`;
    const token = await invite(email);

    await accept(token).expect(201, { email });
    const second = await accept(token).expect(400);
    expect(second.body.error.message).toMatch(/invalid or has expired/);

    const user = await prisma.user.findUniqueOrThrow({
      where: { email },
      include: { accounts: true, members: true },
    });
    expect(user.emailVerified).toBe(true);
    expect(user.accounts[0]?.password).toMatch(/^\$argon2id\$/);
    expect(user.members).toEqual([expect.objectContaining({ organizationId: orgId, role: 'member' })]);
  });

  it('rejects expired and revoked invitations with the same message (T-03)', async () => {
    const expired = await invite(`expired-${run}@test.local`, { expiresAt: new Date(Date.now() - 1000) });
    const revoked = await invite(`revoked-${run}@test.local`, { status: 'canceled' });
    const a = await accept(expired).expect(400);
    const b = await accept(revoked).expect(400);
    expect(a.body.error.message).toBe(b.body.error.message);
  });

  it('lets exactly one of several concurrent accepts win (T-04)', async () => {
    const email = `race-${run}@test.local`;
    const token = await invite(email);
    const results = await Promise.all([1, 2, 3, 4].map((i) => accept(token, `Racer ${i}`)));
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(await prisma.member.count({ where: { user: { email } } })).toBe(1);
  });

  it('does not take over an existing account and keeps the invite usable after the conflict', async () => {
    const email = `owner-${run}@test.local`; // already a user
    const token = await invite(email);
    await accept(token).expect(409);
    const inv = await prisma.invitation.findFirstOrThrow({ where: { email, organizationId: orgId } });
    expect(inv.status).toBe('pending'); // transaction rolled the claim back
  });

  it('rejects unknown fields so callers cannot pick their own role', async () => {
    const token = await invite(`role-${run}@test.local`);
    const res = await request(app.getHttpServer())
      .post('/api/v1/invites/accept')
      .send({ token, name: 'X', password, role: 'owner' })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('keeps public sign-up closed', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/sign-up/email')
      .set('origin', 'http://localhost:3000')
      .send({ email: `public-${run}@test.local`, password, name: 'Public' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('EMAIL_PASSWORD_SIGN_UP_DISABLED');
  });
});
