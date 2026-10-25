// First-run setup for a real deployment (the dev seed refuses production): creates the first workspace
// and its owner. Runs before every deploy but only acts when BOOTSTRAP_* are set and the user is new,
// so it can never reset an existing account's password.
import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'node:crypto';
import { hashPassword } from './auth/password.js';
import { PrismaClient } from './generated/prisma/client.js';

const { BOOTSTRAP_EMAIL, BOOTSTRAP_NAME, BOOTSTRAP_PASSWORD, BOOTSTRAP_WORKSPACE, DATABASE_URL } = process.env;

if (!BOOTSTRAP_EMAIL || !BOOTSTRAP_NAME || !BOOTSTRAP_PASSWORD || !BOOTSTRAP_WORKSPACE) {
  console.log('bootstrap: BOOTSTRAP_* not set, skipping');
  process.exit(0);
}
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');
if (BOOTSTRAP_PASSWORD.length < 12) throw new Error('BOOTSTRAP_PASSWORD must be at least 12 characters');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) });
const email = BOOTSTRAP_EMAIL.toLowerCase();

try {
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    console.log('bootstrap: user already exists, nothing to do');
  } else {
    const userId = randomUUID();
    const slug = BOOTSTRAP_WORKSPACE.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const passwordHash = await hashPassword(BOOTSTRAP_PASSWORD);
    await prisma.$transaction(async (tx) => {
      await tx.user.create({ data: { id: userId, name: BOOTSTRAP_NAME, email, emailVerified: true } });
      await tx.account.create({ data: { id: randomUUID(), userId, accountId: userId, providerId: 'credential', password: passwordHash } });
      const org = await tx.organization.create({ data: { id: randomUUID(), name: BOOTSTRAP_WORKSPACE, slug, status: 'active' } });
      await tx.member.create({ data: { id: randomUUID(), organizationId: org.id, userId, role: 'owner' } });
    });
    console.log(`bootstrap: created owner ${email} and workspace "${BOOTSTRAP_WORKSPACE}"`);
  }
} finally {
  await prisma.$disconnect();
}
