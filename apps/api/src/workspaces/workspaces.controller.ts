import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import {
  invitationParamsSchema,
  inviteMemberSchema,
  memberParamsSchema,
  myInvitationParamsSchema,
  permissionsFor,
  tenantRoleSchema,
  tenantStatusSchema,
  transferOwnershipSchema,
  updateMemberRoleSchema,
  updateWorkspaceSchema,
  type MyWorkspaces,
} from '@repo/shared';
import { createZodDto } from 'nestjs-zod';
import { PrismaService } from '../prisma/prisma.service.js';
import { RequirePermissions } from '../tenancy/guards.js';
import { CurrentActor, Tenant, type Actor, type TenantContext } from '../tenancy/tenant-context.js';
import { MembersService } from './members.service.js';
import { MyInvitationsService } from './my-invitations.service.js';
import { WorkspaceService } from './workspace.service.js';

class InviteMemberDto extends createZodDto(inviteMemberSchema) {}
class UpdateMemberRoleDto extends createZodDto(updateMemberRoleSchema) {}
class MemberParams extends createZodDto(memberParamsSchema) {}
class InvitationParams extends createZodDto(invitationParamsSchema) {}
class MyInvitationParams extends createZodDto(myInvitationParamsSchema) {}
class UpdateWorkspaceDto extends createZodDto(updateWorkspaceSchema) {}
class TransferOwnershipDto extends createZodDto(transferOwnershipSchema) {}

@Controller('me')
export class MeController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invitations: MyInvitationsService,
  ) {}

  // Invitations addressed to the signed-in user's own email (existing-account flow).
  @Get('invitations')
  myInvitations(@CurrentActor() actor: Actor) {
    return this.invitations.list(actor);
  }

  @Post('invitations/:invitationId/accept')
  @HttpCode(200)
  accept(@CurrentActor() actor: Actor, @Param() params: MyInvitationParams) {
    return this.invitations.accept(actor, params.invitationId);
  }

  @Post('invitations/:invitationId/decline')
  @HttpCode(204)
  decline(@CurrentActor() actor: Actor, @Param() params: MyInvitationParams) {
    return this.invitations.decline(actor, params.invitationId);
  }

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
  constructor(
    private readonly members: MembersService,
    private readonly workspace: WorkspaceService,
  ) {}

  @Get()
  @RequirePermissions('workspace.read')
  details(@Tenant() ctx: TenantContext) {
    return this.workspace.get(ctx);
  }

  @Patch()
  @RequirePermissions('workspace.update')
  update(@Tenant() ctx: TenantContext, @Body() body: UpdateWorkspaceDto) {
    return this.workspace.update(ctx, body);
  }

  @Post('leave')
  @HttpCode(204)
  @RequirePermissions('workspace.read')
  leave(@Tenant() ctx: TenantContext) {
    return this.members.leave(ctx);
  }

  @Post('transfer-ownership')
  @HttpCode(200)
  @RequirePermissions('workspace.transfer')
  transfer(@Tenant() ctx: TenantContext, @Body() body: TransferOwnershipDto) {
    return this.members.transferOwnership(ctx, body.memberId);
  }

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
