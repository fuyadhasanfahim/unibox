import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import type { AcceptInvitationInput, InvitationPreview } from '@repo/shared';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { hashPassword } from './password.js';
import { hashToken } from './tokens.js';

// One message for unknown, expired, used and revoked tokens: no oracle for guessing which.
const INVALID = 'This invitation link is invalid or has expired.';
const BLOCKED_ORG_STATUSES = ['suspended', 'closed'];

@Injectable()
export class InvitesService {
  constructor(private readonly prisma: PrismaService) {}

  private usableWhere(tokenHash: string) {
    return {
      tokenHash,
      status: 'pending',
      expiresAt: { gt: new Date() },
      organization: { status: { notIn: BLOCKED_ORG_STATUSES } },
    };
  }

  async preview(token: string): Promise<InvitationPreview> {
    const invitation = await this.prisma.invitation.findFirst({
      where: this.usableWhere(hashToken(token)),
      select: {
        email: true,
        role: true,
        expiresAt: true,
        organization: { select: { name: true } },
        inviter: { select: { name: true } },
      },
    });
    if (!invitation) throw new BadRequestException(INVALID);

    return {
      email: invitation.email,
      organizationName: invitation.organization.name,
      role: invitation.role ?? 'member',
      inviterName: invitation.inviter.name,
      expiresAt: invitation.expiresAt.toISOString(),
    };
  }

  // Creates the user, credential account and membership, and burns the token, all in one transaction.
  async accept({ token, name, password }: AcceptInvitationInput): Promise<{ email: string }> {
    const tokenHash = hashToken(token);
    // Hash outside the transaction: Argon2 is deliberately slow and must not hold row locks.
    const passwordHash = await hashPassword(password);

    return this.prisma.$transaction(async (tx) => {
      const invitation = await tx.invitation.findFirst({ where: this.usableWhere(tokenHash) });
      if (!invitation) throw new BadRequestException(INVALID);

      // Conditional claim: of two concurrent accepts only one sees count === 1 (T-04).
      const claimed = await tx.invitation.updateMany({
        where: { id: invitation.id, status: 'pending', tokenHash },
        data: { status: 'accepted', tokenHash: null },
      });
      if (claimed.count !== 1) throw new BadRequestException(INVALID);

      const existing = await tx.user.findUnique({ where: { email: invitation.email }, select: { id: true } });
      if (existing) {
        // Rolls the claim back; existing users join by signing in instead.
        throw new ConflictException('An account with this email already exists. Sign in to accept the invitation.');
      }

      const userId = randomUUID();
      await tx.user.create({
        // The invite link was delivered to this address, which proves ownership.
        data: { id: userId, name, email: invitation.email, emailVerified: true },
      });
      await tx.account.create({
        data: { id: randomUUID(), userId, accountId: userId, providerId: 'credential', password: passwordHash },
      });
      await tx.member.create({
        data: { id: randomUUID(), organizationId: invitation.organizationId, userId, role: invitation.role ?? 'member' },
      });

      return { email: invitation.email };
    });
  }
}
