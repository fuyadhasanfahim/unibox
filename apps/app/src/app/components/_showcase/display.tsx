"use client";

import { formatDistanceStrict, subMinutes } from "date-fns";
import { Inbox, LayoutGrid, List, MessageCircle, Plus, Rows3 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarGroup } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, Kbd, Separator, Skeleton } from "@/components/ui/misc";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEMO_NOW, makeLeads } from "@/lib/demo-data";
import { Demo, Section } from "./shell";

const INBOX = makeLeads(24).map((l, i) => ({
  ...l,
  at: subMinutes(DEMO_NOW, i * 17 + 3),
  preview: ["Is this still available?", "Thanks, got it!", "Can you share the price list?", "When can you deliver?"][i % 4]!,
  unread: i % 3 === 0,
}));

const TEAM = ["Fuyad Hasan", "Nadia Islam", "Shakib Khan", "Mei Chen", "Diego Silva"];

export function Display() {
  return (
    <Section
      id="display"
      title="Display"
      description="Tabs with a gliding indicator, accordion, avatars, our own scroll area, loading skeletons and empty states."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Demo label="Tabs">
          <Tabs defaultValue="inbox">
            <TabsList>
              <TabsTrigger value="inbox">
                <Inbox />
                Inbox
              </TabsTrigger>
              <TabsTrigger value="grid">
                <LayoutGrid />
                Board
              </TabsTrigger>
              <TabsTrigger value="list">
                <List />
                List
              </TabsTrigger>
            </TabsList>
            <TabsContent value="inbox" className="text-sm text-muted-foreground">
              All conversations across WhatsApp, Messenger and Instagram.
            </TabsContent>
            <TabsContent value="grid" className="text-sm text-muted-foreground">
              Kanban view grouped by status.
            </TabsContent>
            <TabsContent value="list" className="text-sm text-muted-foreground">
              Dense list for power users.
            </TabsContent>
          </Tabs>
        </Demo>

        <Demo label="Avatars · hover the stack">
          <div className="flex items-center gap-6">
            <AvatarGroup>
              {TEAM.map((n, i) => (
                <Avatar key={n} alt={n} status={i < 2 ? "online" : i === 2 ? "away" : undefined} />
              ))}
            </AvatarGroup>
            <span className="text-sm text-muted-foreground">5 teammates online</span>
          </div>
          <Separator />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            Open search with <Kbd>Ctrl</Kbd>
            <Kbd>K</Kbd>
          </div>
        </Demo>

        <Demo label="Scroll area">
          <ScrollArea fade className="h-72 -mx-2">
            <ul className="grid gap-1 px-2 py-2">
              {INBOX.map((c) => (
                <li
                  key={c.id}
                  className="flex cursor-pointer items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-foreground/[0.05]"
                >
                  <Avatar alt={c.name} />
                  <div className="grid min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className={c.unread ? "font-semibold" : "font-medium"}>{c.name}</span>
                      <MessageCircle className="size-3 text-muted-foreground" />
                    </span>
                    <span className="truncate text-xs text-muted-foreground">{c.preview}</span>
                  </div>
                  <div className="grid justify-items-end gap-1">
                    <span className="font-mono text-[0.68rem] text-muted-foreground">
                      {formatDistanceStrict(c.at, DEMO_NOW)}
                    </span>
                    {c.unread && <span className="size-2 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />}
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </Demo>

        <Demo label="Accordion">
          <Accordion type="single" collapsible defaultValue="a">
            <AccordionItem value="a">
              <AccordionTrigger>Which channels are supported?</AccordionTrigger>
              <AccordionContent>WhatsApp Business, Facebook Messenger and Instagram professional accounts.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="b">
              <AccordionTrigger>Can I message customers first?</AccordionTrigger>
              <AccordionContent>
                Only within each platform&apos;s policy. Outside the reply window WhatsApp needs an approved template.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="c">
              <AccordionTrigger>Is my team&apos;s data isolated?</AccordionTrigger>
              <AccordionContent>Yes. Every workspace is a separate tenant and every query is scoped to it.</AccordionContent>
            </AccordionItem>
          </Accordion>
        </Demo>

        <Demo label="Skeleton">
          <div className="grid gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-9 rounded-full" />
                <div className="grid flex-1 gap-2">
                  <Skeleton className="h-3 w-2/5" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        </Demo>

        <Demo label="Empty state">
          <Empty
            icon={Rows3}
            title="No follow-ups due"
            description="You're all caught up. New tasks appear here when a lead needs attention."
            action={
              <Button size="sm">
                <Plus />
                Create follow-up
              </Button>
            }
          />
          <div className="flex justify-center">
            <Badge variant="outline">Empty, loading and error states are part of every screen</Badge>
          </div>
        </Demo>
      </div>
    </Section>
  );
}
