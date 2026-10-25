import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import {
  invitationParamsSchema,
  inviteMemberSchema,
  memberParamsSchema,
  permissionsFor,
  tenantRoleSchema,
  tenantStatusSchema,
  updateMemberRoleSchema,
  type MyWorkspaces,
} from '@repo/shared';
import { createZodDto } from 'nestjs-zod';
import { PrismaService } from '../prisma/prisma.service.js';
import { RequirePermissions } from '../tenancy/guards.js';
import { CurrentActor, Tenant, type Actor, type TenantContext } from '../tenancy/tenant-context.js';
import { MembersService } from './members.service.js';

class InviteMemberDto extends createZodDto(inviteMemberSchema) {}
class UpdateMemberRoleDto extends createZodDto(updateMemberRoleSchema) {}
class MemberParams extends createZodDto(memberParamsSchema) {}
class InvitationParams extends createZodDto(invitationParamsSchema) {}

@Controller('me')
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  // The signed-in user's own memberships (not tenant-scoped: it lists across their tenants).
  @Get('workspaces')
  async workspaces(@CurrentActor() actor: Actor): Promise<MyWorkspaces> {
    const memberships = await this.prisma.member.findMany({
      where: { userId: actor.userId },
      orderBy: { createdAt: 'asc' },
      select: { role: true, organization: { select: { id: true, name: true, slug: true, status: true } } },
    });
    return {
      platformRole: actor.role,
      workspaces: memberships.map((m) => {
        const role = tenantRoleSchema.parse(m.role);
        return { ...m.organization, status: tenantStatusSchema.parse(m.organization.status), role, permissions: permissionsFor(role) };
      }),
    };
  }
}

@Controller('tenants/:tenantId')
export class WorkspaceMembersController {
  constructor(private readonly members: MembersService) {}

  @Get('members')
  @RequirePermissions('members.read')
  list(@Tenant() ctx: TenantContext) {
    return this.members.list(ctx);
  }

  @Patch('members/:memberId')
  @RequirePermissions('members.update_role')
  updateRole(@Tenant() ctx: TenantContext, @Param() params: MemberParams, @Body() body: UpdateMemberRoleDto) {
    return this.members.updateRole(ctx, params.memberId, body.role);
  }

  @Delete('members/:memberId')
  @HttpCode(204)
  @RequirePermissions('members.remove')
  remove(@Tenant() ctx: TenantContext, @Param() params: MemberParams) {
    return this.members.remove(ctx, params.memberId);
  }

  @Get('invitations')
  @RequirePermissions('members.read')
  invitations(@Tenant() ctx: TenantContext) {
    return this.members.listInvitations(ctx);
  }

  @Post('invitations')
  @RequirePermissions('members.invite')
  invite(@Tenant() ctx: TenantContext, @Body() body: InviteMemberDto) {
    return this.members.invite(ctx, body);
  }

  @Delete('invitations/:invitationId')
  @HttpCode(204)
  @RequirePermissions('members.invite')
  revoke(@Tenant() ctx: TenantContext, @Param() params: InvitationParams) {
    return this.members.revokeInvitation(ctx, params.invitationId);
  }
}
