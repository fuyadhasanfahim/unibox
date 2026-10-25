"use client";

import { Building2, KeyRound, UserRound } from "lucide-react";
import { Skeleton } from "@/components/ui/misc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActiveWorkspace } from "@/lib/workspaces";
import { ProfileSection, SecuritySection } from "./account-sections";
import { WorkspaceSection } from "./workspace-section";

export function SettingsView() {
  const { workspace, isPending, can } = useActiveWorkspace();

  return (
    <Tabs defaultValue="profile">
      <TabsList>
        <TabsTrigger value="profile">
          <UserRound /> Profile
        </TabsTrigger>
        <TabsTrigger value="security">
          <KeyRound /> Security
        </TabsTrigger>
        {(isPending || workspace) && (
          <TabsTrigger value="workspace">
            <Building2 /> Workspace
          </TabsTrigger>
        )}
      </TabsList>
      <TabsContent value="profile">
        <ProfileSection />
      </TabsContent>
      <TabsContent value="security">
        <SecuritySection />
      </TabsContent>
      <TabsContent value="workspace">
        {workspace ? <WorkspaceSection workspace={workspace} can={can} /> : <Skeleton className="h-64 rounded-2xl" />}
      </TabsContent>
    </Tabs>
  );
}
