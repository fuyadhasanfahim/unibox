"use client";

import { ArrowRight, CalendarClock, Check, MessagesSquare, Plug, Timer, UserPlus, Users } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/misc";
import { StatCard } from "@/components/ui/stat-card";
import { useMounted } from "@/hooks/use-mounted";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

function greeting(hour: number) {
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const STEPS = [
  { title: "Create your account", description: "You're in. Welcome to Unibox.", done: true, icon: Check },
  { title: "Connect a channel", description: "Link WhatsApp, Messenger or Instagram.", done: false, icon: Plug, href: "/channels", soon: "Phase 2" },
  { title: "Invite your team", description: "Bring in admins, managers and agents.", done: false, icon: UserPlus, href: "/team" },
  { title: "Plan your follow-ups", description: "Never let a warm lead go cold.", done: false, icon: CalendarClock, href: "/follow-ups", soon: "Phase 5" },
];

export function DashboardHome() {
  const mounted = useMounted();
  const { data: session } = authClient.useSession();
  const { data: orgs } = authClient.useListOrganizations();
  const firstName = session?.user.name.split(" ")[0];
  const done = STEPS.filter((s) => s.done).length;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          {firstName ? (
            <h2 className="font-display text-3xl font-bold tracking-tight">
              {/* Clock-dependent text renders after mount so server and client HTML match. */}
              {mounted ? greeting(new Date().getHours()) : "Welcome"}, <span className="text-primary-text">{firstName}</span>
            </h2>
          ) : (
            <Skeleton className="h-9 w-72" />
          )}
          <p className="text-sm text-muted-foreground">
            {orgs?.[0] ? (
              <>
                Here&apos;s what&apos;s happening in <span className="font-medium text-foreground">{orgs[0].name}</span>.
              </>
            ) : (
              "Here's your Unibox overview."
            )}
          </p>
        </div>
        <Badge variant="outline">No channels connected yet</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open conversations" value={0} icon={MessagesSquare} />
        <StatCard label="New leads (7d)" value={0} icon={Users} />
        <StatCard label="Follow-ups due" value={0} icon={CalendarClock} />
        <StatCard label="Avg. first reply (min)" value={0} icon={Timer} />
      </div>

      <Card>
        <CardHeader className="sm:flex sm:items-end sm:justify-between">
          <div className="grid gap-1.5">
            <CardTitle>Get started</CardTitle>
            <CardDescription>
              {done} of {STEPS.length} done. Finish setup to start answering customers from one inbox.
            </CardDescription>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-foreground/10 sm:w-48" aria-hidden>
            <motion.div
              className="h-full rounded-full bg-primary shadow-[0_0_12px_var(--primary)]"
              initial={{ width: 0 }}
              animate={{ width: `${(done / STEPS.length) * 100}%` }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            />
          </div>
        </CardHeader>
        <ol className="grid gap-2 sm:grid-cols-2">
          {STEPS.map((step, i) => (
            <motion.li
              key={step.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.06 }}
              className="flex items-center gap-3 rounded-xl border border-border bg-foreground/[0.02] p-3.5"
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-xl [&_svg]:size-4",
                  step.done ? "bg-primary text-primary-foreground" : "bg-foreground/[0.06] text-muted-foreground",
                )}
              >
                <step.icon />
              </span>
              <div className="grid min-w-0 flex-1">
                <span className={cn("text-sm font-medium", step.done && "text-muted-foreground line-through")}>{step.title}</span>
                <span className="truncate text-xs text-muted-foreground">{step.description}</span>
              </div>
              {step.soon ? (
                <Badge variant="outline">{step.soon}</Badge>
              ) : step.href ? (
                <Link href={step.href} className={buttonVariants({ variant: "glass", size: "sm" })}>
                  Open <ArrowRight />
                </Link>
              ) : null}
            </motion.li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
