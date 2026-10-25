"use client";

import { Check, ChevronsUpDown, MailOpen, Monitor, Moon, PanelLeftClose, PanelLeftOpen, Sparkles, Sun } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import type { ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/toaster";
import { Tooltip } from "@/components/ui/tooltip";
import { useMounted } from "@/hooks/use-mounted";
import { cn, focusRing } from "@/lib/utils";
import { useActiveWorkspace, useMyInvitations, useSwitchWorkspace } from "@/lib/workspaces";
import { useUi } from "@/stores/ui";
import { NAV, type NavItem } from "./nav";

export const SIDEBAR_WIDTH = 256;
export const SIDEBAR_COLLAPSED_WIDTH = 72;

const spring = { type: "spring", stiffness: 380, damping: 36 } as const;

// Tooltip only when the label is hidden (collapsed rail) or the control is icon-only.
function MaybeTooltip({ show, label, children }: { show: boolean; label: string; children: ReactNode }) {
  return show ? (
    <Tooltip content={label} side="right">
      {children}
    </Tooltip>
  ) : (
    children
  );
}

function Label({ collapsed, children, className }: { collapsed: boolean; children: ReactNode; className?: string }) {
  return (
    <AnimatePresence initial={false}>
      {!collapsed && (
        <motion.span
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -4 }}
          transition={{ duration: 0.15 }}
          className={cn("truncate", className)}
        >
          {children}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

function NavLink({ item, collapsed, onNavigate, layoutId }: { item: NavItem; collapsed: boolean; onNavigate?: () => void; layoutId: string }) {
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  return (
    <MaybeTooltip show={collapsed} label={item.label}>
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        aria-label={collapsed ? item.label : undefined}
        className={cn(
          "group relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
          collapsed && "justify-center px-0",
          active ? "text-foreground" : "text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground",
          focusRing,
        )}
      >
        {active && (
          <motion.span
            layoutId={layoutId}
            transition={spring}
            className="absolute inset-0 rounded-xl bg-primary-soft ring-1 ring-primary/25"
          >
            <span className="absolute inset-y-2 -left-px w-[3px] rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
          </motion.span>
        )}
        <item.icon
          className={cn(
            "relative size-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110",
            active && "text-primary-text",
          )}
        />
        <Label collapsed={collapsed} className="relative">
          {item.label}
        </Label>
      </Link>
    </MaybeTooltip>
  );
}

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

const footerBtn = cn(
  "relative grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:text-foreground [&_svg]:size-4",
  focusRing,
);

function SidebarFooter({ collapsed, showCollapse }: { collapsed: boolean; showCollapse: boolean }) {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const toggleSidebar = useUi((s) => s.toggleSidebar);
  const current = mounted ? theme : undefined;

  return (
    <div className={cn("flex items-center gap-1.5 border-t border-border p-2.5", collapsed ? "flex-col" : "justify-between")}>
      <div
        role="radiogroup"
        aria-label="Theme"
        className={cn("flex gap-0.5 rounded-xl bg-foreground/[0.05] p-0.5", collapsed && "flex-col")}
      >
        {THEMES.map((t) => (
          <Tooltip key={t.value} content={t.label} side={collapsed ? "right" : "top"}>
            <button
              type="button"
              role="radio"
              aria-checked={current === t.value}
              aria-label={`${t.label} theme`}
              onClick={() => setTheme(t.value)}
              className={cn(footerBtn, "size-8", current === t.value && "text-primary-foreground hover:text-primary-foreground")}
            >
              {current === t.value && (
                <motion.span layoutId="theme-pill" transition={spring} className="absolute inset-0 rounded-lg bg-primary shadow-[0_2px_10px_-2px_oklch(0.841_0.238_128.9/0.7)]" />
              )}
              <t.icon className="relative" />
            </button>
          </Tooltip>
        ))}
      </div>
      {showCollapse && (
        <Tooltip content={collapsed ? "Expand sidebar" : "Collapse sidebar"} side={collapsed ? "right" : "top"}>
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            className={cn(footerBtn, "hover:bg-foreground/[0.06]")}
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </button>
        </Tooltip>
      )}
    </div>
  );
}

function WorkspaceInitial({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary/50 to-chart-5/40 text-xs font-bold text-foreground",
        className,
      )}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

// Active workspace lives on the session (server-side); switching calls Better Auth's setActive,
// which re-checks membership. Every tenant query is keyed by workspace id, so nothing leaks across.
function WorkspaceSwitcher({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const router = useRouter();
  const { workspace, data } = useActiveWorkspace();
  const { data: invitations } = useMyInvitations();
  const switchTo = useSwitchWorkspace();
  const name = workspace?.name ?? (data?.platformRole === "super_admin" ? "Platform admin" : "No workspace");
  const pending = invitations?.length ?? 0;

  return (
    <DropdownMenu>
      <MaybeTooltip show={collapsed} label={name}>
        <DropdownMenuTrigger
          className={cn(
            "group relative mx-2.5 flex items-center gap-2.5 rounded-xl border border-border bg-foreground/[0.03] p-2 text-left transition-colors",
            "hover:bg-foreground/[0.06] data-[state=open]:bg-foreground/[0.06]",
            collapsed && "mx-auto size-10 justify-center p-0",
            focusRing,
          )}
          aria-label={`Workspace: ${name}. Switch workspace`}
        >
          <WorkspaceInitial name={name} />
          <Label collapsed={collapsed} className="grid min-w-0 flex-1">
            <span className="truncate text-sm font-semibold">{name}</span>
            <span className="truncate text-[0.7rem] capitalize text-muted-foreground">{workspace ? workspace.role : "Unibox"}</span>
          </Label>
          {!collapsed && <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />}
          {pending > 0 && (
            <span
              aria-label={`${pending} pending invitation${pending === 1 ? "" : "s"}`}
              className={cn("absolute size-2 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]", collapsed ? "-right-0.5 -top-0.5" : "right-2 top-2")}
            />
          )}
        </DropdownMenuTrigger>
      </MaybeTooltip>
      <DropdownMenuContent align="start" side={collapsed ? "right" : "bottom"} className="w-64">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        {data?.workspaces.map((w) => {
          const active = w.id === workspace?.id;
          const usable = w.status === "active";
          return (
            <DropdownMenuItem
              key={w.id}
              disabled={!usable || switchTo.isPending}
              onSelect={() => {
                if (active) return;
                switchTo.mutate(w.id, {
                  onSuccess: () => {
                    toast.success(`Switched to ${w.name}`);
                    onNavigate?.();
                    router.push("/dashboard");
                  },
                  onError: (e) => toast.error(e.message),
                });
              }}
            >
              <WorkspaceInitial name={w.name} className="size-6 rounded-md text-[0.65rem]" />
              <span className="grid min-w-0 flex-1">
                <span className="truncate font-medium text-foreground">{w.name}</span>
                <span className="text-xs capitalize text-muted-foreground">{usable ? w.role : w.status}</span>
              </span>
              {active && <Check className="text-primary-text!" />}
            </DropdownMenuItem>
          );
        })}
        {data && data.workspaces.length === 0 && <p className="px-2.5 py-2 text-sm text-muted-foreground">You&apos;re not in any workspace yet.</p>}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/invitations" onClick={onNavigate}>
            <MailOpen />
            Invitations
            {pending > 0 && <span className="ml-auto rounded-full bg-primary px-1.5 font-mono text-[0.7rem] font-semibold text-primary-foreground">{pending}</span>}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Shared by the floating desktop sidebar and the mobile sheet.
export function SidebarBody({
  collapsed,
  onNavigate,
  showCollapse = true,
  layoutId = "nav-active",
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  showCollapse?: boolean;
  layoutId?: string;
}) {
  return (
    <div className="flex h-full flex-col">
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className={cn("flex h-16 shrink-0 items-center gap-2.5 px-4 font-display text-lg font-bold tracking-tight", collapsed && "justify-center px-0")}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_24px_-4px_oklch(0.841_0.238_128.9/0.8)]">
          <Sparkles className="size-4" />
        </span>
        <Label collapsed={collapsed}>unibox</Label>
      </Link>

      <WorkspaceSwitcher collapsed={collapsed} onNavigate={onNavigate} />

      <ScrollArea className="mt-3 min-h-0 flex-1">
        <nav aria-label="Main" className="grid gap-5 px-2.5 pb-4">
          {NAV.map((group) => (
            <div key={group.label} className="grid gap-1">
              {collapsed ? (
                <span aria-hidden className="mx-auto mb-1 h-px w-6 bg-border" />
              ) : (
                <span className="px-3 pb-1 text-[0.68rem] font-semibold uppercase tracking-widest text-muted-foreground/70">
                  {group.label}
                </span>
              )}
              {group.items.map((item) => (
                <NavLink key={item.href} item={item} collapsed={collapsed} onNavigate={onNavigate} layoutId={layoutId} />
              ))}
            </div>
          ))}
        </nav>
      </ScrollArea>

      <SidebarFooter collapsed={collapsed} showCollapse={showCollapse} />
    </div>
  );
}

export function AppSidebar() {
  const collapsed = useUi((s) => s.sidebarCollapsed);
  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH }}
      transition={spring}
      className="glass fixed inset-y-3 left-3 z-40 hidden overflow-hidden rounded-2xl md:block"
    >
      <SidebarBody collapsed={collapsed} />
    </motion.aside>
  );
}
