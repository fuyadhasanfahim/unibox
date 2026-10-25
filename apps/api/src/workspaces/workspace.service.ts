import { Injectable, NotFoundException } from '@nestjs/common';
import { tenantStatusSchema, type UpdateWorkspaceInput, type WorkspaceDetails } from '@repo/shared';
import { AuditService } from '../audit/audit.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { TenantContext } from '../tenancy/tenant-context.js';

const SELECT = { id: true, name: true, slug: true, status: true, timeZone: true, defaultLocale: true, createdAt: true } as const;

// Organization is the tenant row itself, so it is addressed by ctx.tenantId (never a client id).
@Injectable()
export class WorkspaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private toDto(o: { id: string; name: string; slug: string; status: string; timeZone: string; defaultLocale: string; createdAt: Date }): WorkspaceDetails {
    return { ...o, status: tenantStatusSchema.parse(o.status), createdAt: o.createdAt.toISOString() };
  }

  async get(ctx: TenantContext): Promise<WorkspaceDetails> {
    const org = await this.prisma.organization.findUnique({ where: { id: ctx.tenantId }, select: SELECT });
    if (!org) throw new NotFoundException('Workspace not found');
    return this.toDto(org);
  }

  async update(ctx: TenantContext, input: UpdateWorkspaceInput): Promise<WorkspaceDetails> {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.organization.findUnique({ where: { id: ctx.tenantId }, select: SELECT });
      if (!before) throw new NotFoundException('Workspace not found');

      const after = await tx.organization.update({ where: { id: ctx.tenantId }, data: input, select: SELECT });
      const changes = Object.fromEntries(
        (Object.keys(input) as (keyof UpdateWorkspaceInput)[])
          .filter((k) => before[k] !== after[k])
          .map((k) => [k, { from: before[k], to: after[k] }]),
      );
      if (Object.keys(changes).length > 0) {
        await this.audit.log(
          {
            tenantId: ctx.tenantId,
            actorUserId: ctx.userId,
            action: 'workspace.updated',
            resourceType: 'tenant',
            resourceId: ctx.tenantId,
            requestId: ctx.requestId,
            metadata: changes,
          },
          tx,
        );
      }
      return this.toDto(after);
    });
  }
}
