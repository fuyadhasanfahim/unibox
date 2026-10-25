"use client";

import type {
  InvitationDto,
  InviteMemberInput,
  InviteResult,
  MemberDto,
  MyWorkspaces,
  Permission,
  TenantRole,
} from "@repo/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMounted } from "@/hooks/use-mounted";
import { api } from "./api";

export const workspaceKeys = {
  mine: ["me", "workspaces"] as const,
  members: (tenantId: string) => ["tenants", tenantId, "members"] as const,
  invitations: (tenantId: string) => ["tenants", tenantId, "invitations"] as const,
};

export function useMyWorkspaces() {
  return useQuery({ queryKey: workspaceKeys.mine, queryFn: () => api<MyWorkspaces>("/me/workspaces") });
}

// Until the workspace switcher lands, the active workspace is the user's first one.
// Reports "pending" until after hydration: another component (the sidebar) may already have
// fetched this query, and rendering that data during hydration would not match the server HTML.
export function useActiveWorkspace() {
  const mounted = useMounted();
  const query = useMyWorkspaces();
  const data = mounted ? query.data : undefined;
  const workspace = data?.workspaces[0];
  const permissions = new Set<Permission>(workspace?.permissions ?? []);
  return {
    data,
    error: query.error,
    isPending: !mounted || query.isPending,
    workspace,
    // UI hint only: the API enforces every permission again.
    can: (permission: Permission) => permissions.has(permission),
  };
}

export function useMembers(tenantId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: workspaceKeys.members(tenantId ?? ""),
    queryFn: () => api<MemberDto[]>(`/tenants/${tenantId}/members`),
    enabled: Boolean(tenantId) && enabled,
  });
}

export function useInvitations(tenantId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: workspaceKeys.invitations(tenantId ?? ""),
    queryFn: () => api<InvitationDto[]>(`/tenants/${tenantId}/invitations`),
    enabled: Boolean(tenantId) && enabled,
  });
}

export function useInviteMember(tenantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: InviteMemberInput) =>
      api<InviteResult>(`/tenants/${tenantId}/invitations`, { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: workspaceKeys.invitations(tenantId) }),
  });
}

export function useRevokeInvitation(tenantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) => api<void>(`/tenants/${tenantId}/invitations/${invitationId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: workspaceKeys.invitations(tenantId) }),
  });
}

export function useUpdateMemberRole(tenantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: TenantRole }) =>
      api<{ id: string; role: TenantRole }>(`/tenants/${tenantId}/members/${memberId}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }),
    // Optimistic: the role pill flips instantly, and rolls back if the server says no.
    onMutate: async ({ memberId, role }) => {
      const key = workspaceKeys.members(tenantId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<MemberDto[]>(key);
      qc.setQueryData<MemberDto[]>(key, (rows) => rows?.map((m) => (m.id === memberId ? { ...m, role } : m)));
      return { previous };
    },
    onError: (_e, _v, context) => {
      if (context?.previous) qc.setQueryData(workspaceKeys.members(tenantId), context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: workspaceKeys.members(tenantId) }),
  });
}

export function useRemoveMember(tenantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => api<void>(`/tenants/${tenantId}/members/${memberId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: workspaceKeys.members(tenantId) }),
  });
}
