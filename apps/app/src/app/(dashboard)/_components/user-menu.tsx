"use client";

import { ChevronsUpDown, Keyboard, LifeBuoy, LogOut, Settings, ShieldCheck, UserRound, Users } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/misc";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toaster";
import { authClient } from "@/lib/auth-client";
import { cn, focusRing } from "@/lib/utils";

export function UserMenu() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isPending } = authClient.useSession();
  const [signingOut, setSigningOut] = useState(false);

  if (isPending || !data) return <Skeleton className="h-10 w-10 rounded-full sm:w-48 sm:rounded-xl" />;
  const { user } = data;

  async function signOut() {
    setSigningOut(true);
    const { error } = await authClient.signOut();
    if (error) {
      setSigningOut(false);
      toast.error("Couldn't sign out. Try again.");
      return;
    }
    // Drop every cached tenant query so the next person on this browser never sees this user's data.
    queryClient.clear();
    router.replace("/sign-in");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "group flex h-10 items-center gap-2.5 rounded-xl p-1 pr-1 text-left transition-colors hover:bg-foreground/[0.06] data-[state=open]:bg-foreground/[0.06] sm:pr-2.5",
          focusRing,
        )}
        aria-label={`Account menu for ${user.name}`}
      >
        <Avatar alt={user.name} src={user.image ?? undefined} className="size-8" status="online" />
        <span className="hidden min-w-0 max-w-40 flex-col leading-tight sm:flex">
          <span className="truncate text-sm font-semibold">{user.name}</span>
          <span className="truncate text-xs text-muted-foreground">{user.email}</span>
        </span>
        <ChevronsUpDown className="hidden size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground sm:block" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-3 py-2.5 font-normal text-foreground">
          <Avatar alt={user.name} src={user.image ?? undefined} className="size-10" />
          <span className="grid min-w-0">
            <span className="truncate text-sm font-semibold">{user.name}</span>
            <span className="truncate text-xs text-muted-foreground">{user.email}</span>
            {user.role === "super_admin" && (
              <Badge variant="lime" className="mt-1.5 w-fit">
                <ShieldCheck /> Platform admin
              </Badge>
            )}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <UserRound />
              Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings />
              Workspace settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/team">
              <Users />
              Team &amp; invitations
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => toast("Press Ctrl/⌘ K anywhere to search and jump between pages.")}>
            <Keyboard />
            Keyboard shortcuts
            <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => toast("Help center is coming soon.")}>
            <LifeBuoy />
            Help &amp; support
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <div className="p-1">
          <DropdownMenuItem
            disabled={signingOut}
            onSelect={(e) => {
              e.preventDefault(); // keep the menu open while signing out
              void signOut();
            }}
            className="justify-center bg-destructive/12 font-semibold text-destructive data-[highlighted]:bg-destructive data-[highlighted]:text-white [&_svg]:text-current"
          >
            {signingOut ? <Spinner /> : <LogOut />}
            {signingOut ? "Signing out…" : "Sign out"}
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
