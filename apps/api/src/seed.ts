// Dev-only seed: demo workspace, its owner, and a fresh teammate invitation link.
// Run: pnpm --filter @repo/api db:seed
import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'node:crypto';
import { INVITATION_TTL_SECONDS } from './auth/auth.js';
import { hashPassword } from './auth/password.js';
import { createToken } from './auth/tokens.js';
import { envFilePath } from './config/env.js';
import { PrismaClient } from './generated/prisma/client.js';

try {
  process.loadEnvFile(envFilePath);
} catch {
  // rely on real env
}

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to seed a production database.');
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const appUrl = process.env.APP_URL ?? 'http://localhost:3000';

// Fixed dev credentials (owner's request). Weaker than the 12-char policy and visible in git:
// local dev database only, never reuse anywhere real.
const DEV_PASSWORD = '54114789';
const INVITE_EMAIL = 'invitee@unibox.local';

type SeedUser = { email: string; name: string; role: 'user' | 'super_admin' };
const USERS: Record<'fuyad' | 'owner' | 'super', SeedUser> = {
  fuyad: { email: 'fuyad@gmail.com', name: 'Fuyad Hasan', role: 'user' },
  owner: { email: 'owner@mail.com', name: 'Acme Owner', role: 'user' },
  super: { email: 'super@mail.com', name: 'Unibox Super Admin', role: 'super_admin' },
};

async function upsertUser(u: SeedUser, passwordHash: string) {
  // Upsert so re-running the seed always restores the known dev password and platform role.
  const user = await prisma.user.upsert({
    where: { email: u.email },
    update: { name: u.name, emailVerified: true, role: u.role },
    create: { id: randomUUID(), name: u.name, email: u.email, emailVerified: true, role: u.role },
  });
  const credential = await prisma.account.findFirst({ where: { userId: user.id, providerId: 'credential' } });
  if (credential) {
    await prisma.account.update({ where: { id: credential.id }, data: { password: passwordHash } });
  } else {
    await prisma.account.create({
      data: { id: randomUUID(), userId: user.id, accountId: user.id, providerId: 'credential', password: passwordHash },
    });
  }
  return user;
}

async function addOwner(organizationId: string, userId: string) {
  await prisma.member.upsert({
    where: { organizationId_userId: { organizationId, userId } },
    update: { role: 'owner' },
    create: { id: randomUUID(), organizationId, userId, role: 'owner' },
  });
}

async function main() {
  const passwordHash = await hashPassword(DEV_PASSWORD);
  const fuyad = await upsertUser(USERS.fuyad, passwordHash);
  const owner = await upsertUser(USERS.owner, passwordHash);
  await upsertUser(USERS.super, passwordHash); // platform staff: deliberately not a member of any tenant

  // Two separate tenants, each with its own owner.
  const demo = await prisma.organization.upsert({
    where: { slug: 'unibox-demo' },
    update: {},
    create: { id: randomUUID(), name: 'Unibox Demo', slug: 'unibox-demo', status: 'active' },
  });
  await addOwner(demo.id, fuyad.id);
  const acme = await prisma.organization.upsert({
    where: { slug: 'acme-traders' },
    update: {},
    create: { id: randomUUID(), name: 'Acme Traders', slug: 'acme-traders', status: 'active' },
  });
  await addOwner(acme.id, owner.id);

  // One live invite per email: cancel older pending ones, then issue a new token.
  await prisma.invitation.updateMany({
    where: { organizationId: demo.id, email: INVITE_EMAIL, status: 'pending' },
    data: { status: 'canceled', tokenHash: null },
  });
  const token = createToken();
  await prisma.invitation.create({
    data: {
      id: randomUUID(),
      organizationId: demo.id,
      email: INVITE_EMAIL,
      role: 'agent',
      status: 'pending',
      expiresAt: new Date(Date.now() + INVITATION_TTL_SECONDS * 1000),
      inviterId: fuyad.id,
      tokenHash: token.hash,
    },
  });

  console.log('\nSeeded (dev password set for all three):');
  console.log(`  super  : ${USERS.super.email}  platform super admin, no tenant`);
  console.log(`  owner  : ${USERS.owner.email}  owner of "Acme Traders"`);
  console.log(`  fuyad  : ${USERS.fuyad.email}  owner of "Unibox Demo"`);
  console.log(`  Invite (${INVITE_EMAIL} -> Unibox Demo, 48h, single use):`);
  console.log(`  ${appUrl}/sign-up?invitation_token=${token.raw}\n`);
}

await main().finally(() => prisma.$disconnect());
