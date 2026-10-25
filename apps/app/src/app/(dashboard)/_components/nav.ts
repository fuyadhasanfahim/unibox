import {
  CalendarClock,
  Inbox,
  LayoutDashboard,
  Plug,
  Settings,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; description: string };

export const NAV: { label: string; items: NavItem[] }[] = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Overview of your workspace" },
      { href: "/inbox", label: "Inbox", icon: Inbox, description: "WhatsApp, Messenger and Instagram in one place" },
      { href: "/leads", label: "Leads", icon: UsersRound, description: "Contacts you are working to convert" },
      { href: "/follow-ups", label: "Follow-ups", icon: CalendarClock, description: "Reminders and tasks for your team" },
    ],
  },
  {
    label: "Manage",
    items: [
      { href: "/channels", label: "Channels", icon: Plug, description: "Connected messaging accounts" },
      { href: "/team", label: "Team", icon: Users, description: "Members, roles and invitations" },
      { href: "/settings", label: "Settings", icon: Settings, description: "Workspace and profile settings" },
    ],
  },
];

export const ALL_NAV = NAV.flatMap((g) => g.items);

export function navForPath(pathname: string): NavItem | undefined {
  return ALL_NAV.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
}
