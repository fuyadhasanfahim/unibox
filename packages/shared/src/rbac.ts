import { z } from "zod";

// ---------------------------------------------------------------------------
// Tenant (workspace) roles and permissions. Single source of truth:
// the API enforces these, the web app uses them only to show/hide UI.
// Code checks PERMISSIONS, never role names.
// ---------------------------------------------------------------------------

export const TENANT_ROLES = ["owner", "admin", "manager", "agent"] as const;
export const tenantRoleSchema = z.enum(TENANT_ROLES);
export type TenantRole = z.infer<typeof tenantRoleSchema>;

// Higher rank = more authority. Used for "you cannot grant or touch a role above your own".
export const ROLE_RANK: Record<TenantRole, number> = { owner: 4, admin: 3, manager: 2, agent: 1 };

export const PERMISSIONS = [
  "workspace.read",
  "workspace.update",
  "workspace.delete",
  "workspace.transfer",
  "members.read",
  "members.invite",
  "members.update_role",
  "members.remove",
  "channels.read",
  "channels.manage",
  "conversations.read_all",
  "conversations.read_assigned",
  "conversations.assign",
  "conversations.self_assign",
  "messages.send",
  "notes.write",
  "leads.read",
  "leads.write",
  "followups.read",
  "followups.manage_all",
  "followups.manage_own",
  "audit.read",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const AGENT: readonly Permission[] = [
  "workspace.read",
  "members.read",
  "channels.read",
  "conversations.read_assigned", // assigned to them + unassigned
  "conversations.self_assign",
  "messages.send",
  "notes.write",
  "leads.read",
  "leads.write",
  "followups.read",
  "followups.manage_own",
];

const MANAGER: readonly Permission[] = [
  ...AGENT,
  "conversations.read_all",
  "conversations.assign",
  "followups.manage_all",
  "audit.read",
];

const ADMIN: readonly Permission[] = [
  ...MANAGER,
  "workspace.update",
  "members.invite",
  "members.update_role",
  "members.remove",
  "channels.manage",
];

const OWNER: readonly Permission[] = [...ADMIN, "workspace.delete", "workspace.transfer"];

export const ROLE_PERMISSIONS: Record<TenantRole, ReadonlySet<Permission>> = {
  owner: new Set(OWNER),
  admin: new Set(ADMIN),
  manager: new Set(MANAGER),
  agent: new Set(AGENT),
};

export function hasPermission(role: TenantRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}

export function permissionsFor(role: TenantRole): Permission[] {
  return PERMISSIONS.filter((p) => ROLE_PERMISSIONS[role].has(p));
}

// Nobody can hand out, or act on someone holding, a role above their own.
export function outranksOrEquals(actor: TenantRole, other: TenantRole): boolean {
  return ROLE_RANK[actor] >= ROLE_RANK[other];
}

// ---------------------------------------------------------------------------
// Platform (Unibox staff) roles live on User.role and are separate from tenant roles.
// ---------------------------------------------------------------------------
export const PLATFORM_ROLES = ["user", "super_admin"] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const TENANT_STATUSES = ["pending", "active", "suspended", "closed"] as const;
export const tenantStatusSchema = z.enum(TENANT_STATUSES);
export type TenantStatus = z.infer<typeof tenantStatusSchema>;
