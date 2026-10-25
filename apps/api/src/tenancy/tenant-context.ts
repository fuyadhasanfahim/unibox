import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { TenantRole } from '@repo/shared';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import type { RequestWithId } from '../common/request-id.middleware.js';

// Resolved by TenantMembershipGuard from the route's :tenantId and the signed-in user.
// Services receive it explicitly: there is no ambient "current tenant".
export type TenantContext = {
  tenantId: string;
  userId: string;
  memberId: string;
  role: TenantRole;
  requestId: string;
};

export type AppRequest = RequestWithId & {
  session?: UserSession | null;
  tenant?: TenantContext;
  params: Record<string, string>;
};

export const Tenant = createParamDecorator((_: unknown, ctx: ExecutionContext): TenantContext => {
  const tenant = ctx.switchToHttp().getRequest<AppRequest>().tenant;
  // Only reachable if a route forgot the guard: fail closed instead of running unscoped.
  if (!tenant) throw new Error('Tenant context missing: add @RequirePermissions() to this route');
  return tenant;
});

// Signed-in user + request id for non-tenant routes (platform admin, /me).
export type Actor = { userId: string; email: string; emailVerified: boolean; role: string; requestId: string };

export const CurrentActor = createParamDecorator((_: unknown, ctx: ExecutionContext): Actor => {
  const req = ctx.switchToHttp().getRequest<AppRequest>();
  const user = req.session?.user as
    | ({ id: string; email: string; emailVerified: boolean; role?: string } & Record<string, unknown>)
    | undefined;
  if (!user) throw new Error('No session: this route must not be @AllowAnonymous');
  return {
    userId: user.id,
    // Better Auth stores emails lowercased; normalize anyway since invitations match on it.
    email: user.email.toLowerCase(),
    emailVerified: user.emailVerified === true,
    role: user.role ?? 'user',
    requestId: req.id,
  };
});
