"use client";

import { TENANT_ROLES } from "@repo/shared";
import { KeyRound, MailPlus, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Empty, Skeleton } from "@/components/ui/misc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActiveWorkspace, useInvitations, useMembers } from "@/lib/workspaces";
import { InvitationsTab } from "./invitations-tab";
import { InviteDialog } from "./invite-dialog";
import { MembersTab } from "./members-tab";
import { PermissionsTab } from "./permissions-tab";
import { ROLE_INFO } from "./role-meta";

function Count({ n }: { n?: number }) {
  return n === undefined ? null : (
    <span className="rounded-full bg-foreground/10 px-1.5 font-mono text-[0.7rem] tabular-nums group-data-[state=active]:bg-primary-foreground/15">
      {n}
    </span>
  );
}

export function TeamView() {
  const { workspace, isPending, can } = useActiveWorkspace();
  const members = useMembers(workspace?.id);
  const invitations = useInvitations(workspace?.id);

  if (isPending) return <Skeleton className="h-96 rounded-2xl" />;
  if (!workspace) {
    return (
      <Card className="min-h-[50vh] items-center justify-center">
        <Empty icon={Users} title="No workspace yet" description="You're not a member of any workspace. Ask an owner to invite you." />
      </Card>
    );
  }

  const byRole = TENANT_ROLES.map((r) => ({ role: r, count: members.data?.filter((m) => m.role === r).length ?? 0 }));

  return (
    <div className="grid gap-5">
      <Card className="gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid gap-1.5">
          <h2 className="font-display text-2xl font-bold tracking-tight">{workspace.name}</h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {members.data ? (
              byRole.map(({ role, count }) => {
                const Icon = ROLE_INFO[role].icon;
                return (
                  <span key={role} className="inline-flex items-center gap-1.5">
                    <Icon className="size-3.5" />
                    <span className="font-mono tabular-nums text-foreground">{count}</span> {ROLE_INFO[role].label.toLowerCase()}
                    {count === 1 ? "" : "s"}
                  </span>
                );
              })
            ) : (
              <Skeleton className="h-4 w-64" />
            )}
          </div>
        </div>
        {can("members.invite") && <InviteDialog tenantId={workspace.id} myRole={workspace.role} />}
      </Card>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members" className="group">
            <Users /> Members <Count n={members.data?.length} />
          </TabsTrigger>
          <TabsTrigger value="invitations" className="group">
            <MailPlus /> Invitations <Count n={invitations.data?.length} />
          </TabsTrigger>
          <TabsTrigger value="roles">
            <KeyRound /> Roles &amp; permissions
          </TabsTrigger>
        </TabsList>
        <TabsContent value="members">
          <MembersTab tenantId={workspace.id} myRole={workspace.role} can={can} />
        </TabsContent>
        <TabsContent value="invitations">
          <InvitationsTab tenantId={workspace.id} myRole={workspace.role} canInvite={can("members.invite")} />
        </TabsContent>
        <TabsContent value="roles">
          <PermissionsTab myRole={workspace.role} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
