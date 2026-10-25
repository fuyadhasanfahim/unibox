"use client";

import { outranksOrEquals, TENANT_ROLES, type MemberDto, type Permission, type TenantRole } from "@repo/shared";
import { formatDistanceToNowStrict } from "date-fns";
import { MoreHorizontal, UserMinus, Users } from "lucide-react";
import { createContext, useContext, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { columnHelper, DataTable, SortHeader, type DataTableColumn } from "@/components/ui/data-table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Empty, Skeleton } from "@/components/ui/misc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { ApiError } from "@/lib/api";
import { useMembers, useRemoveMember, useUpdateMemberRole } from "@/lib/workspaces";
import { RoleBadge, ROLE_INFO } from "./role-meta";

type TeamCtx = { tenantId: string; myRole: TenantRole; can: (p: Permission) => boolean };
const TeamContext = createContext<TeamCtx | null>(null);
const useTeam = () => useContext(TeamContext)!;

const errorText = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);

// Mirrors the server rules so the UI only offers what will succeed (the API still decides).
function canManage(ctx: TeamCtx, member: MemberDto, permission: Permission) {
  return ctx.can(permission) && !member.isYou && outranksOrEquals(ctx.myRole, member.role);
}

function RoleCell({ member }: { member: MemberDto }) {
  const ctx = useTeam();
  const update = useUpdateMemberRole(ctx.tenantId);
  const [confirmOwner, setConfirmOwner] = useState(false);

  if (!canManage(ctx, member, "members.update_role")) return <RoleBadge role={member.role} />;

  const change = (role: TenantRole) =>
    update.mutate(
      { memberId: member.id, role },
      {
        onSuccess: () => toast.success(`${member.name} is now ${ROLE_INFO[role].label.toLowerCase()}`),
        onError: (e) => toast.error(errorText(e, "Couldn't change the role.")),
      },
    );

  return (
    <>
      <Select value={member.role} onValueChange={(v) => (v === "owner" ? setConfirmOwner(true) : change(v as TenantRole))}>
        <SelectTrigger aria-label={`Role for ${member.name}`} className="h-8 w-36 border-transparent bg-transparent px-2 hover:border-border">
          <SelectValue>
            <RoleBadge role={member.role} />
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {TENANT_ROLES.filter((r) => outranksOrEquals(ctx.myRole, r)).map((r) => (
            <SelectItem key={r} value={r}>
              <span className="grid">
                <span className="font-medium">{ROLE_INFO[r].label}</span>
                <span className="max-w-60 text-xs text-muted-foreground">{ROLE_INFO[r].description}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <AlertDialog open={confirmOwner} onOpenChange={setConfirmOwner}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Make {member.name} an owner?</AlertDialogTitle>
            <AlertDialogDescription>
              Owners have full control, including removing other owners and deleting the workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-primary text-primary-foreground hover:bg-primary-hover" onClick={() => change("owner")}>
              Make owner
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ActionsCell({ member }: { member: MemberDto }) {
  const ctx = useTeam();
  const remove = useRemoveMember(ctx.tenantId);
  const [confirm, setConfirm] = useState(false);
  if (!canManage(ctx, member, "members.remove")) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${member.name}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{member.name}</DropdownMenuLabel>
          <DropdownMenuItem destructive onSelect={() => setConfirm(true)}>
            <UserMinus />
            Remove from workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {member.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They lose access to this workspace immediately. Their account stays, and you can invite them again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                remove.mutate(member.id, {
                  onSuccess: () => toast.success(`${member.name} was removed`),
                  onError: (e) => toast.error(errorText(e, "Couldn't remove this member.")),
                })
              }
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

const h = columnHelper<MemberDto>();
const ROLE_ORDER: Record<TenantRole, number> = { owner: 0, admin: 1, manager: 2, agent: 3 };

const columns: DataTableColumn<MemberDto>[] = [
  // Name and email in one searchable value.
  h.accessor((m) => `${m.name} ${m.email}`, {
    id: "member",
    header: ({ column }) => <SortHeader column={column} title="Member" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <Avatar alt={row.original.name} src={row.original.image ?? undefined} />
        <div className="grid">
          <span className="flex items-center gap-2 font-medium">
            {row.original.name}
            {row.original.isYou && <Badge variant="lime">You</Badge>}
          </span>
          <span className="text-xs text-muted-foreground">{row.original.email}</span>
        </div>
      </div>
    ),
  }),
  h.accessor("role", {
    header: ({ column }) => <SortHeader column={column} title="Role" />,
    sortFn: (a, b) => ROLE_ORDER[a.original.role] - ROLE_ORDER[b.original.role],
    cell: ({ row }) => <RoleCell member={row.original} />,
  }),
  h.accessor("joinedAt", {
    header: ({ column }) => <SortHeader column={column} title="Joined" />,
    enableGlobalFilter: false,
    cell: ({ row }) => (
      <span className="text-muted-foreground">{formatDistanceToNowStrict(new Date(row.original.joinedAt), { addSuffix: true })}</span>
    ),
  }),
  {
    id: "actions",
    enableHiding: false,
    enableSorting: false,
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => <ActionsCell member={row.original} />,
  },
];

export function MembersTab(ctx: TeamCtx) {
  const { data, isPending, error, refetch } = useMembers(ctx.tenantId);

  if (isPending) {
    return (
      <div className="grid gap-3" aria-busy>
        <Skeleton className="h-10 w-72" />
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <Empty
        icon={Users}
        title="Couldn't load the team"
        description={errorText(error, "Something went wrong.")}
        action={
          <Button variant="glass" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        }
      />
    );
  }

  return (
    <TeamContext.Provider value={ctx}>
      <DataTable columns={columns} data={data} getRowId={(m) => m.id} searchPlaceholder="Search name, email or role…" />
    </TeamContext.Provider>
  );
}
