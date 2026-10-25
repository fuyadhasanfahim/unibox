import {
  applyDecorators,
  ForbiddenException,
  Injectable,
  NotFoundException,
  SetMetadata,
  UnauthorizedException,
  UseGuards,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { hasPermission, idSchema, tenantRoleSchema, type Permission } from '@repo/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AppRequest } from './tenant-context.js';

const PERMISSIONS_KEY = 'unibox:permissions';

function userIdOf(req: AppRequest): string {
  const id = req.session?.user?.id;
  if (!id) throw new UnauthorizedException();
  return id;
}

/**
 * Step 2 of 3 (after Better Auth's global AuthGuard): the signed-in user must be a member of the
 * :tenantId in the URL, and that tenant must be active. Non-members get 404, so tenant ids
 * cannot be probed. On success the request carries `req.tenant` for @Tenant().
 */
@Injectable()
export class TenantMembershipGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AppRequest>();
    const userId = userIdOf(req);
    const tenantId = idSchema.safeParse(req.params.tenantId);
    if (!tenantId.success) throw new NotFoundException('Workspace not found');

    const member = await this.prisma.member.findUnique({
      where: { organizationId_userId: { organizationId: tenantId.data, userId } },
      select: { id: true, role: true, organization: { select: { status: true } } },
    });
    if (!member) throw new NotFoundException('Workspace not found');

    if (member.organization.status !== 'active') {
      throw new ForbiddenException({
        code: member.organization.status === 'pending' ? 'TENANT_PENDING' : 'TENANT_SUSPENDED',
        message:
          member.organization.status === 'pending'
            ? 'This workspace is waiting for approval.'
            : 'This workspace is not active. Contact Unibox support.',
      });
    }

    // The DB has a CHECK constraint too; parsing here keeps the type honest.
    const role = tenantRoleSchema.parse(member.role);
    req.tenant = { tenantId: tenantId.data, userId, memberId: member.id, role, requestId: req.id };
    return true;
  }
}

/** Step 3 of 3: the member's role must grant every listed permission. */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[] | undefined>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const tenant = context.switchToHttp().getRequest<AppRequest>().tenant;
    // Fail closed: a tenant route without declared permissions, or without context, is denied.
    if (!required?.length || !tenant) throw new ForbiddenException();
    if (!required.every((p) => hasPermission(tenant.role, p))) {
      throw new ForbiddenException("You don't have permission to do that in this workspace.");
    }
    return true;
  }
}

/**
 * The one decorator tenant routes use: membership + permission checks, in that order.
 * Usage: @RequirePermissions('members.invite') on a handler under /tenants/:tenantId/...
 */
export function RequirePermissions(...permissions: [Permission, ...Permission[]]) {
  return applyDecorators(
    SetMetadata(PERMISSIONS_KEY, permissions),
    UseGuards(TenantMembershipGuard, PermissionGuard),
  );
}

/** Unibox staff only (User.role = super_admin). Separate from, and never implied by, tenant roles. */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AppRequest>();
    userIdOf(req);
    const role = (req.session?.user as { role?: unknown } | undefined)?.role;
    if (role !== 'super_admin') throw new ForbiddenException('Platform administrators only.');
    return true;
  }
}

export const PlatformAdmin = () => UseGuards(PlatformAdminGuard);
