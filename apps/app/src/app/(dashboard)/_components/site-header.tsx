"use client";

import { Bell, BellOff, Menu, Monitor, Moon, Search, Sun } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Empty, Kbd } from "@/components/ui/misc";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Tooltip } from "@/components/ui/tooltip";
import { cn, focusRing } from "@/lib/utils";
import { useUi } from "@/stores/ui";
import { SidebarBody } from "./app-sidebar";
import { NAV, navForPath, SECONDARY_NAV } from "./nav";
import { UserMenu } from "./user-menu";

function SearchCommand() {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const run = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search"
        className={cn(
          "flex h-10 items-center gap-2.5 rounded-xl border border-border bg-input px-3 text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground",
          "w-10 justify-center px-0 sm:w-56 sm:justify-start sm:px-3 lg:w-72",
          focusRing,
        )}
      >
        <Search className="size-4 shrink-0" />
        <span className="hidden flex-1 text-left sm:inline">Search…</span>
        <span className="hidden gap-1 sm:flex">
          <Kbd>Ctrl</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Search">
        <CommandInput placeholder="Search pages and actions…" />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          {NAV.map((group) => (
            <CommandGroup key={group.label} heading={group.label}>
              {group.items.map((item) => (
                <CommandItem key={item.href} value={`${item.label} ${item.description}`} onSelect={() => run(() => router.push(item.href))}>
                  <item.icon />
                  {item.label}
                  <span className="ml-auto truncate text-xs text-muted-foreground">{item.description}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
          <CommandGroup heading="Account">
            {SECONDARY_NAV.map((item) => (
              <CommandItem key={item.href} value={`${item.label} ${item.description}`} onSelect={() => run(() => router.push(item.href))}>
                <item.icon />
                {item.label}
                <span className="ml-auto truncate text-xs text-muted-foreground">{item.description}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Theme">
            <CommandItem onSelect={() => run(() => setTheme("light"))}>
              <Sun /> Light
            </CommandItem>
            <CommandItem onSelect={() => run(() => setTheme("dark"))}>
              <Moon /> Dark
            </CommandItem>
            <CommandItem onSelect={() => run(() => setTheme("system"))}>
              <Monitor /> System
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

function Notifications() {
  return (
    <Popover>
      <Tooltip content="Notifications" side="bottom">
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell />
          </Button>
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="font-display font-semibold">Notifications</p>
          <span className="text-xs text-muted-foreground">0 unread</span>
        </div>
        <Empty
          icon={BellOff}
          title="You're all caught up"
          description="New messages, assignments and due follow-ups will show up here."
          className="py-8"
        />
      </PopoverContent>
    </Popover>
  );
}

function MobileNav() {
  const open = useUi((s) => s.mobileNavOpen);
  const setOpen = useUi((s) => s.setMobileNavOpen);
  return (
    <>
      <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation" onClick={() => setOpen(true)}>
        <Menu />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          aria-describedby={undefined}
          className="w-72 gap-0 p-0"
          // Focus the panel itself, not its first button, so a tooltip doesn't pop open on arrival.
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            (e.currentTarget as HTMLElement).focus();
          }}
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarBody collapsed={false} showCollapse={false} layoutId="nav-active-mobile" onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const page = navForPath(pathname);

  return (
    <header className="glass sticky top-3 z-30 flex h-16 items-center gap-2 rounded-2xl px-3 sm:px-4">
      <MobileNav />
      <div className="min-w-0 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            <h1 className="truncate font-display text-lg font-bold tracking-tight sm:text-xl">{page?.label ?? "Unibox"}</h1>
            {page && <p className="hidden truncate text-xs text-muted-foreground lg:block">{page.description}</p>}
          </motion.div>
        </AnimatePresence>
      </div>
      <SearchCommand />
      <Notifications />
      <span aria-hidden className="mx-1 hidden h-6 w-px bg-border sm:block" />
      <UserMenu />
    </header>
  );
}
