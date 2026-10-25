import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { tenantRoleSchema, type AcceptInvitationResult, type MyInvitationDto } from '@repo/shared';
import { randomUUID } from 'node:crypto';
import { AuditService } from '../audit/audit.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Actor } from '../tenancy/tenant-context.js';

const NOT_FOUND = 'This invitation was not found or is no longer valid.';

/**
 * Invitations for people who already have an account. Authority = the signed-in user's own,
 * verified email address: an invitation id alone is never enough, so ids cannot be replayed
 * by someone else.
 */
@Injectable()
export class MyInvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private usableWhere(actor: Actor) {
    return {
      email: actor.email,
      status: 'pending',
      expiresAt: { gt: new Date() },
      organization: { status: { notIn: ['suspended', 'closed'] } },
    };
  }

  private assertVerified(actor: Actor) {
    if (!actor.emailVerified) throw new ForbiddenException('Verify your email address to accept invitations.');
  }

  async list(actor: Actor): Promise<MyInvitationDto[]> {
    if (!actor.emailVerified) return [];
    const rows = await this.prisma.invitation.findMany({
      where: this.usableWhere(actor),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        role: true,
        expiresAt: true,
        organization: { select: { id: true, name: true } },
        inviter: { select: { name: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      workspaceId: r.organization.id,
      workspaceName: r.organization.name,
      role: tenantRoleSchema.parse(r.role ?? 'agent'),
      invitedBy: r.inviter.name,
      expiresAt: r.expiresAt.toISOString(),
    }));
  }

  async accept(actor: Actor, invitationId: string): Promise<AcceptInvitationResult> {
    this.assertVerified(actor);
    return this.prisma.$transaction(async (tx) => {
      const invitation = await tx.invitation.findFirst({
        where: { id: invitationId, ...this.usableWhere(actor) },
        select: { id: true, role: true, organizationId: true, organization: { select: { name: true } } },
      });
      if (!invitation) throw new NotFoundException(NOT_FOUND);

      // Conditional claim: concurrent accepts of the same invitation cannot both succeed.
      const claimed = await tx.invitation.updateMany({
        where: { id: invitation.id, status: 'pending' },
        data: { status: 'accepted', tokenHash: null },
      });
      if (claimed.count !== 1) throw new NotFoundException(NOT_FOUND);

      const role = tenantRoleSchema.parse(invitation.role ?? 'agent');
      const existing = await tx.member.findUnique({
        where: { organizationId_userId: { organizationId: invitation.organizationId, userId: actor.userId } },
        select: { role: true },
      });

      // Already a member (e.g. added another way): accepting just closes the invitation,
      // it never changes their current role.
      if (!existing) {
        const memberId = randomUUID();
        await tx.member.create({ data: { id: memberId, organizationId: invitation.organizationId, userId: actor.userId, role } });
        await this.audit.log(
          {
            tenantId: invitation.organizationId,
            actorUserId: actor.userId,
            action: 'member.joined',
            resourceType: 'member',
            resourceId: memberId,
            requestId: actor.requestId,
            metadata: { role, invitationId: invitation.id, existingAccount: true },
          },
          tx,
        );
      }

      return {
        workspaceId: invitation.organizationId,
        workspaceName: invitation.organization.name,
        role: existing ? tenantRoleSchema.parse(existing.role) : role,
      };
    });
  }

  async decline(actor: Actor, invitationId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const invitation = await tx.invitation.findFirst({
        where: { id: invitationId, email: actor.email, status: 'pending' },
        select: { id: true, organizationId: true },
      });
      if (!invitation) throw new NotFoundException(NOT_FOUND);

      await tx.invitation.updateMany({ where: { id: invitation.id, status: 'pending' }, data: { status: 'rejected', tokenHash: null } });
      await this.audit.log(
        {
          tenantId: invitation.organizationId,
          actorUserId: actor.userId,
          action: 'member.invitation_declined',
          resourceType: 'invitation',
          resourceId: invitation.id,
          requestId: actor.requestId,
        },
        tx,
      );
    });
  }
}
