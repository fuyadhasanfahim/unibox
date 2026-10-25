import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  hasPermission,
  outranksOrEquals,
  tenantRoleSchema,
  type InvitationDto,
  type InviteMemberInput,
  type InviteResult,
  type MemberDto,
  type TenantRole,
} from '@repo/shared';
import { randomUUID } from 'node:crypto';
import { AuditService } from '../audit/audit.service.js';
import { INVITATION_TTL_SECONDS } from '../auth/auth.js';
import { createToken } from '../auth/tokens.js';
import { TenantPrismaService, type TenantDb } from '../prisma/tenant-prisma.service.js';
import type { TenantContext } from '../tenancy/tenant-context.js';
import { InvitationMailer } from './invitation-mailer.js';

type Tx = Parameters<Parameters<TenantDb['$transaction']>[0]>[0];

const RANK_DENIED = "You can't assign or manage a role higher than your own.";

@Injectable()
export class MembersService {
  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly audit: AuditService,
    private readonly mailer: InvitationMailer,
  ) {}

  async list(ctx: TenantContext): Promise<MemberDto[]> {
    const db = this.tenantPrisma.forTenant(ctx.tenantId);
    const members = await db.member.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, role: true, createdAt: true, user: { select: { id: true, name: true, email: true, image: true } } },
    });
    return members.map((m) => ({
      id: m.id,
      role: tenantRoleSchema.parse(m.role),
      joinedAt: m.createdAt.toISOString(),
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      image: m.user.image,
      isYou: m.user.id === ctx.userId,
    }));
  }

  async listInvitations(ctx: TenantContext): Promise<InvitationDto[]> {
    const db = this.tenantPrisma.forTenant(ctx.tenantId);
    const rows = await db.invitation.findMany({
      where: { status: 'pending', expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, role: true, expiresAt: true, createdAt: true, inviter: { select: { name: true } } },
    });
    return rows.map((i) => ({
      id: i.id,
      email: i.email,
      role: tenantRoleSchema.parse(i.role ?? 'agent'),
      invitedBy: i.inviter.name,
      invitedAt: i.createdAt.toISOString(),
      expiresAt: i.expiresAt.toISOString(),
    }));
  }

  async invite(ctx: TenantContext, input: InviteMemberInput): Promise<InviteResult> {
    if (!outranksOrEquals(ctx.role, input.role)) throw new ForbiddenException(RANK_DENIED);
    const db = this.tenantPrisma.forTenant(ctx.tenantId);
    const token = createToken();

    const result = await db.$transaction(async (tx) => {
      const existing = await tx.member.findFirst({ where: { user: { email: input.email } }, select: { id: true } });
      if (existing) throw new ConflictException('This person is already a member of the workspace.');

      // One live invitation per email: replace any older pending one (its link stops working).
      await tx.invitation.updateMany({
        where: { email: input.email, status: 'pending' },
        data: { status: 'canceled', tokenHash: null },
      });
      const invitation = await tx.invitation.create({
        data: {
          id: randomUUID(),
          organizationId: ctx.tenantId,
          email: input.email,
          role: input.role,
          status: 'pending',
          expiresAt: new Date(Date.now() + INVITATION_TTL_SECONDS * 1000),
          inviterId: ctx.userId,
          tokenHash: token.hash,
        },
        select: { id: true, email: true, role: true, expiresAt: true, organization: { select: { name: true } }, inviter: { select: { name: true } } },
      });
      await this.audit.log(
        {
          tenantId: ctx.tenantId,
          actorUserId: ctx.userId,
          action: 'member.invited',
          resourceType: 'invitation',
          resourceId: invitation.id,
          requestId: ctx.requestId,
          metadata: { role: input.role },
        },
        tx,
      );
      return invitation;
    });

    const emailSent = await this.mailer.sendInvite({
      to: result.email,
      rawToken: token.raw,
      organizationName: result.organization.name,
      inviterName: result.inviter.name,
      role: input.role,
    });
    return { id: result.id, email: result.email, role: input.role, expiresAt: result.expiresAt.toISOString(), emailSent };
  }

  async revokeInvitation(ctx: TenantContext, invitationId: string) {
    const db = this.tenantPrisma.forTenant(ctx.tenantId);
    await db.$transaction(async (tx) => {
      const invitation = await tx.invitation.findFirst({ where: { id: invitationId, status: 'pending' }, select: { role: true } });
      if (!invitation) throw new NotFoundException('Invitation not found');
      if (!outranksOrEquals(ctx.role, tenantRoleSchema.parse(invitation.role ?? 'agent'))) throw new ForbiddenException(RANK_DENIED);

      await tx.invitation.updateMany({ where: { id: invitationId, status: 'pending' }, data: { status: 'canceled', tokenHash: null } });
      await this.audit.log(
        { tenantId: ctx.tenantId, actorUserId: ctx.userId, action: 'member.invitation_revoked', resourceType: 'invitation', resourceId: invitationId, requestId: ctx.requestId },
        tx,
      );
    });
  }

  async updateRole(ctx: TenantContext, memberId: string, role: TenantRole) {
    const db = this.tenantPrisma.forTenant(ctx.tenantId);
    return db.$transaction(async (tx) => {
      const target = await this.lockAndLoadTarget(tx, ctx, memberId, "You can't change your own role.");
      if (!hasPermission(target.actorRole, 'members.update_role')) throw new ForbiddenException();
      if (!outranksOrEquals(target.actorRole, target.role) || !outranksOrEquals(target.actorRole, role)) {
        throw new ForbiddenException(RANK_DENIED);
      }
      if (target.role === role) return { id: target.id, role };
      if (target.role === 'owner') await this.assertAnotherOwner(tx);

      await tx.member.updateMany({ where: { id: target.id }, data: { role } });
      await this.audit.log(
        {
          tenantId: ctx.tenantId,
          actorUserId: ctx.userId,
          action: 'member.role_changed',
          resourceType: 'member',
          resourceId: target.id,
          requestId: ctx.requestId,
          metadata: { from: target.role, to: role, userId: target.userId },
        },
        tx,
      );
      return { id: target.id, role };
    });
  }

  async remove(ctx: TenantContext, memberId: string) {
    const db = this.tenantPrisma.forTenant(ctx.tenantId);
    await db.$transaction(async (tx) => {
      const target = await this.lockAndLoadTarget(tx, ctx, memberId, "You can't remove yourself here.");
      if (!hasPermission(target.actorRole, 'members.remove')) throw new ForbiddenException();
      if (!outranksOrEquals(target.actorRole, target.role)) throw new ForbiddenException(RANK_DENIED);
      if (target.role === 'owner') await this.assertAnotherOwner(tx);

      await tx.member.deleteMany({ where: { id: target.id } });
      // Their open sessions must not keep pointing at this workspace.
      await tx.session.updateMany({
        where: { userId: target.userId, activeOrganizationId: ctx.tenantId },
        data: { activeOrganizationId: null },
      });
      await this.audit.log(
        {
          tenantId: ctx.tenantId,
          actorUserId: ctx.userId,
          action: 'member.removed',
          resourceType: 'member',
          resourceId: target.id,
          requestId: ctx.requestId,
          metadata: { role: target.role, userId: target.userId },
        },
        tx,
      );
    });
  }

  // Locks the tenant row so concurrent role changes/removals are serialized; without it two owners
  // demoting each other at the same moment could both pass the "another owner exists" check.
  private async lockAndLoadTarget(tx: Tx, ctx: TenantContext, memberId: string, selfMessage: string) {
    await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${ctx.tenantId} FOR UPDATE`;
    // Re-read the actor under the lock: the guard's view of their role may be stale if it was
    // changed by a request that committed in between.
    const actor = await tx.member.findFirst({ where: { id: ctx.memberId }, select: { role: true } });
    if (!actor) throw new ForbiddenException("You're no longer a member of this workspace.");
    const target = await tx.member.findFirst({ where: { id: memberId }, select: { id: true, role: true, userId: true } });
    if (!target) throw new NotFoundException('Member not found');
    if (target.id === ctx.memberId) throw new ForbiddenException(selfMessage);
    return { ...target, role: tenantRoleSchema.parse(target.role), actorRole: tenantRoleSchema.parse(actor.role) };
  }

  private async assertAnotherOwner(tx: Tx) {
    const owners = await tx.member.count({ where: { role: 'owner' } });
    if (owners <= 1) {
      throw new ConflictException({ code: 'LAST_OWNER', message: 'A workspace needs at least one owner. Make someone else owner first.' });
    }
  }
}
