"use client";

import type {
  AcceptInvitationResult,
  InvitationDto,
  InviteMemberInput,
  InviteResult,
  MemberDto,
  MyInvitationDto,
  MyWorkspaces,
  Permission,
  TenantRole,
  UpdateWorkspaceInput,
  WorkspaceDetails,
} from "@repo/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMounted } from "@/hooks/use-mounted";
import { api } from "./api";
import { authClient } from "./auth-client";

export const workspaceKeys = {
  mine: ["me", "workspaces"] as const,
  myInvitations: ["me", "invitations"] as const,
  members: (tenantId: string) => ["tenants", tenantId, "members"] as const,
  invitations: (tenantId: string) => ["tenants", tenantId, "invitations"] as const,
  details: (tenantId: string) => ["tenants", tenantId, "details"] as const,
};

export function useMyWorkspaces() {
  return useQuery({ queryKey: workspaceKeys.mine, queryFn: () => api<MyWorkspaces>("/me/workspaces") });
}

// Active workspace = the session's activeOrganizationId (server-side, set via setActive), falling
// back to the first active membership. Reports "pending" until after hydration: another component
// may already have this query cached, and rendering it during hydration would not match the HTML.
export function useActiveWorkspace() {
  const mounted = useMounted();
  const query = useMyWorkspaces();
  const session = authClient.useSession();
  const data = mounted ? query.data : undefined;
  const activeId = session.data?.session.activeOrganizationId;
  const usable = data?.workspaces.filter((w) => w.status === "active") ?? [];
  const workspace = usable.find((w) => w.id === activeId) ?? usable[0];
  const permissions = new Set<Permission>(workspace?.permissions ?? []);
  return {
    data,
    error: query.error,
    isPending: !mounted || query.isPending || session.isPending,
    workspace,
    // UI hint only: the API enforces every permission again.
    can: (permission: Permission) => permissions.has(permission),
  };
}

export function useSwitchWorkspace() {
  const qc = useQueryClient();
  const session = authClient.useSession();
  return useMutation({
    mutationFn: async (workspaceId: string) => {
      // Better Auth checks membership before storing it on the session.
      const { error } = await authClient.organization.setActive({ organizationId: workspaceId });
      if (error) throw new Error(error.message ?? "Couldn't switch workspace.");
    },
    onSuccess: async () => {
      await session.refetch();
      await qc.invalidateQueries();
    },
  });
}

export function useMyInvitations() {
  return useQuery({ queryKey: workspaceKeys.myInvitations, queryFn: () => api<MyInvitationDto[]>("/me/invitations") });
}

export function useAcceptMyInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) => api<AcceptInvitationResult>(`/me/invitations/${invitationId}/accept`, { method: "POST" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: workspaceKeys.myInvitations });
      void qc.invalidateQueries({ queryKey: workspaceKeys.mine });
    },
  });
}

export function useDeclineMyInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) => api<void>(`/me/invitations/${invitationId}/decline`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: workspaceKeys.myInvitations }),
  });
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

export function useWorkspaceDetails(tenantId: string | undefined) {
  return useQuery({
    queryKey: workspaceKeys.details(tenantId ?? ""),
    queryFn: () => api<WorkspaceDetails>(`/tenants/${tenantId}`),
    enabled: Boolean(tenantId),
  });
}

export function useUpdateWorkspace(tenantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateWorkspaceInput) =>
      api<WorkspaceDetails>(`/tenants/${tenantId}`, { method: "PATCH", body: JSON.stringify(input) }),
    onSuccess: (details) => {
      qc.setQueryData(workspaceKeys.details(tenantId), details);
      void qc.invalidateQueries({ queryKey: workspaceKeys.mine }); // name shows in the switcher
    },
  });
}

export function useTransferOwnership(tenantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) =>
      api<{ newOwnerMemberId: string; yourRole: TenantRole }>(`/tenants/${tenantId}/transfer-ownership`, {
        method: "POST",
        body: JSON.stringify({ memberId }),
      }),
    // Your own role changed: refresh permissions and the member list.
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useLeaveWorkspace(tenantId: string) {
  const qc = useQueryClient();
  const session = authClient.useSession();
  return useMutation({
    mutationFn: () => api<void>(`/tenants/${tenantId}/leave`, { method: "POST" }),
    onSuccess: async () => {
      // The server cleared this workspace from the session; pick up whatever is active next.
      await session.refetch();
      qc.removeQueries({ queryKey: ["tenants", tenantId] });
      await qc.invalidateQueries({ queryKey: workspaceKeys.mine });
    },
  });
}
