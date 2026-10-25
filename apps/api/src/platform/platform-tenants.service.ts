import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateTenantInput, SetTenantStatusInput } from '@repo/shared';
import { randomBytes, randomUUID } from 'node:crypto';
import { AuditService } from '../audit/audit.service.js';
import { INVITATION_TTL_SECONDS } from '../auth/auth.js';
import { createToken } from '../auth/tokens.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Actor } from '../tenancy/tenant-context.js';
import { InvitationMailer } from '../workspaces/invitation-mailer.js';

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  // Random suffix: slugs stay unique without a lookup race.
  return `${base || 'workspace'}-${randomBytes(3).toString('hex')}`;
}

// Platform staff see tenant metadata only (name, status, counts, owners), never tenant content.
@Injectable()
export class PlatformTenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mailer: InvitationMailer,
  ) {}

  async list() {
    const orgs = await this.prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        createdAt: true,
        _count: { select: { members: true } },
        members: { where: { role: 'owner' }, select: { user: { select: { email: true } } } },
        invitations: { where: { role: 'owner', status: 'pending' }, select: { email: true } },
      },
    });
    return orgs.map((o) => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      status: o.status,
      createdAt: o.createdAt.toISOString(),
      memberCount: o._count.members,
      owners: o.members.map((m) => m.user.email),
      pendingOwnerInvites: o.invitations.map((i) => i.email),
    }));
  }

  async create(actor: Actor, input: CreateTenantInput) {
    const token = createToken();
    const result = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { id: randomUUID(), name: input.name, slug: slugify(input.name), status: 'active' },
        select: { id: true, name: true, slug: true, status: true },
      });
      const existingUser = await tx.user.findUnique({ where: { email: input.ownerEmail }, select: { id: true } });

      if (existingUser) {
        // Already a Unibox user: make them owner directly (platform authority) and notify them.
        await tx.member.create({ data: { id: randomUUID(), organizationId: org.id, userId: existingUser.id, role: 'owner' } });
      } else {
        await tx.invitation.create({
          data: {
            id: randomUUID(),
            organizationId: org.id,
            email: input.ownerEmail,
            role: 'owner',
            status: 'pending',
            expiresAt: new Date(Date.now() + INVITATION_TTL_SECONDS * 1000),
            inviterId: actor.userId,
            tokenHash: token.hash,
          },
        });
      }
      await this.audit.log(
        {
          tenantId: org.id,
          actorUserId: actor.userId,
          action: 'tenant.created',
          resourceType: 'tenant',
          resourceId: org.id,
          requestId: actor.requestId,
          metadata: { ownerAddedDirectly: Boolean(existingUser) },
        },
        tx,
      );
      return { org, ownerExisted: Boolean(existingUser) };
    });

    const emailSent = result.ownerExisted
      ? await this.mailer.sendAdded({ to: input.ownerEmail, organizationName: result.org.name, role: 'owner' })
      : await this.mailer.sendInvite({
          to: input.ownerEmail,
          rawToken: token.raw,
          organizationName: result.org.name,
          inviterName: 'The Unibox team',
          role: 'owner',
        });
    return { ...result.org, owner: input.ownerEmail, ownerAddedDirectly: result.ownerExisted, emailSent };
  }

  async setStatus(actor: Actor, tenantId: string, input: SetTenantStatusInput) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.organization.findUnique({ where: { id: tenantId }, select: { status: true } });
      if (!current) throw new NotFoundException('Workspace not found');
      if (current.status === input.status) return { id: tenantId, status: input.status };

      await tx.organization.update({ where: { id: tenantId }, data: { status: input.status } });
      await this.audit.log(
        {
          tenantId,
          actorUserId: actor.userId,
          action: 'tenant.status_changed',
          resourceType: 'tenant',
          resourceId: tenantId,
          requestId: actor.requestId,
          metadata: { from: current.status, to: input.status, reason: input.reason },
        },
        tx,
      );
      return { id: tenantId, status: input.status };
    });
  }
}
