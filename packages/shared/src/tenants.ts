import { z } from "zod";
import { emailSchema } from "./auth.js";
import { tenantRoleSchema, tenantStatusSchema, type Permission, type TenantRole, type TenantStatus } from "./rbac.js";

// Opaque ids from the database; validated for shape only (authorization comes from the guards).
export const idSchema = z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/, "Invalid id");

export const tenantParamsSchema = z.strictObject({ tenantId: idSchema });
export const memberParamsSchema = z.strictObject({ tenantId: idSchema, memberId: idSchema });
export const invitationParamsSchema = z.strictObject({ tenantId: idSchema, invitationId: idSchema });

export const inviteMemberSchema = z.strictObject({
  email: emailSchema,
  role: tenantRoleSchema,
});

export const updateMemberRoleSchema = z.strictObject({
  role: tenantRoleSchema,
});

// Platform admin
export const createTenantSchema = z.strictObject({
  name: z.string().trim().min(2, "Use at least 2 characters").max(80),
  ownerEmail: emailSchema,
});

export const setTenantStatusSchema = z.strictObject({
  status: tenantStatusSchema.exclude(["pending"]),
  reason: z.string().trim().min(3, "Give a short reason").max(500),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type SetTenantStatusInput = z.infer<typeof setTenantStatusSchema>;

// ---------------------------------------------------------------------------
// Response contracts (API returns these shapes; the web app types its queries with them).
// ---------------------------------------------------------------------------

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  role: TenantRole;
  permissions: Permission[];
};

export type MyWorkspaces = { platformRole: string; workspaces: WorkspaceSummary[] };

export type MemberDto = {
  id: string;
  role: TenantRole;
  joinedAt: string;
  userId: string;
  name: string;
  email: string;
  image: string | null;
  isYou: boolean;
};

export type InvitationDto = {
  id: string;
  email: string;
  role: TenantRole;
  invitedBy: string;
  invitedAt: string;
  expiresAt: string;
};

export type InviteResult = { id: string; email: string; role: TenantRole; expiresAt: string; emailSent: boolean };
