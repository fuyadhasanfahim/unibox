import type { Permission, TenantRole } from "@repo/shared";
import { Crown, Headset, ShieldCheck, UserCog, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const ROLE_INFO: Record<TenantRole, { label: string; description: string; icon: LucideIcon; tone: string }> = {
  owner: {
    label: "Owner",
    description: "Full control of the workspace, including deleting it and managing other owners.",
    icon: Crown,
    tone: "border-primary/35 bg-primary-soft text-primary-text",
  },
  admin: {
    label: "Admin",
    description: "Manages the team, channels and settings. Can't touch owners or delete the workspace.",
    icon: ShieldCheck,
    tone: "border-chart-5/35 bg-chart-5/12 text-chart-5",
  },
  manager: {
    label: "Manager",
    description: "Runs the inbox: sees every conversation, assigns work and tracks follow-ups.",
    icon: UserCog,
    tone: "border-chart-4/35 bg-chart-4/12 text-chart-4",
  },
  agent: {
    label: "Agent",
    description: "Answers customers: assigned and unassigned conversations, own leads and follow-ups.",
    icon: Headset,
    tone: "border-border bg-foreground/[0.05] text-foreground/80",
  },
};

export function RoleBadge({ role, className }: { role: TenantRole; className?: string }) {
  const info = ROLE_INFO[role];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", info.tone, className)}>
      <info.icon className="size-3" />
      {info.label}
    </span>
  );
}

// Exhaustive on purpose: adding a permission in @repo/shared without a label here is a type error.
export const PERMISSION_INFO: Record<Permission, { label: string; group: string }> = {
  "workspace.read": { label: "View the workspace", group: "Workspace" },
  "workspace.update": { label: "Edit workspace settings", group: "Workspace" },
  "workspace.delete": { label: "Delete the workspace", group: "Workspace" },
  "workspace.transfer": { label: "Transfer ownership", group: "Workspace" },
  "members.read": { label: "See team members", group: "Team" },
  "members.invite": { label: "Invite people", group: "Team" },
  "members.update_role": { label: "Change roles", group: "Team" },
  "members.remove": { label: "Remove members", group: "Team" },
  "channels.read": { label: "See connected channels", group: "Channels" },
  "channels.manage": { label: "Connect and disconnect channels", group: "Channels" },
  "conversations.read_all": { label: "See every conversation", group: "Inbox" },
  "conversations.read_assigned": { label: "See assigned and unassigned conversations", group: "Inbox" },
  "conversations.assign": { label: "Assign conversations to anyone", group: "Inbox" },
  "conversations.self_assign": { label: "Claim conversations", group: "Inbox" },
  "messages.send": { label: "Reply to customers", group: "Inbox" },
  "notes.write": { label: "Write internal notes", group: "Inbox" },
  "leads.read": { label: "See leads", group: "Leads" },
  "leads.write": { label: "Create and edit leads", group: "Leads" },
  "followups.read": { label: "See follow-ups", group: "Follow-ups" },
  "followups.manage_all": { label: "Manage everyone's follow-ups", group: "Follow-ups" },
  "followups.manage_own": { label: "Manage own follow-ups", group: "Follow-ups" },
  "audit.read": { label: "View the audit log", group: "Security" },
};
