"use client";

import { Archive, Bell, Copy, Filter, MoreHorizontal, Pencil, Trash2, UserPlus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/controls";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toaster";
import { Tooltip } from "@/components/ui/tooltip";
import { Demo, Section } from "./shell";

export function Overlays() {
  return (
    <Section
      id="overlays"
      title="Overlays"
      description="Radix handles focus trapping, Escape, outside click and screen-reader semantics. We own the glass, the motion and the API. Press Ctrl/⌘ K for the command palette."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Demo label="Dialog">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="glass">
                <UserPlus />
                Invite teammate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite a teammate</DialogTitle>
                <DialogDescription>They will get an email with a single-use link that expires in 48 hours.</DialogDescription>
              </DialogHeader>
              <Field label="Email" hint="Work email only">
                <Input type="email" placeholder="nadia@company.com" />
              </Field>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost">Cancel</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button onClick={() => toast.success("Invite sent")}>Send invite</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Demo>

        <Demo label="Alert dialog">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 />
                Delete channel
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Disconnect WhatsApp?</AlertDialogTitle>
                <AlertDialogDescription>
                  New messages will stop arriving. Existing conversations stay in the inbox. You can reconnect later.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep it</AlertDialogCancel>
                <AlertDialogAction onClick={() => toast("Channel disconnected", { description: "WhatsApp · +880 1711…" })}>
                  Disconnect
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Demo>

        <Demo label="Popover">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="glass">
                <Filter />
                Filters
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="grid gap-4">
              <p className="font-display font-semibold">Filter conversations</p>
              {["Unread only", "Assigned to me", "Has follow-up"].map((f, i) => (
                <div key={f} className="flex items-center gap-3">
                  <Checkbox id={`f-${i}`} defaultChecked={i === 0} />
                  <Label htmlFor={`f-${i}`} className="font-normal">
                    {f}
                  </Label>
                </div>
              ))}
            </PopoverContent>
          </Popover>
        </Demo>

        <Demo label="Dropdown menu">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="glass" size="icon" aria-label="Conversation actions">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Conversation</DropdownMenuLabel>
              <DropdownMenuItem>
                <Pencil />
                Rename
                <DropdownMenuShortcut>R</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy />
                Copy link
                <DropdownMenuShortcut>⌘C</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Archive />
                Archive
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive>
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Demo>

        <Demo label="Tooltip & toast">
          <div className="flex flex-wrap gap-2">
            <Tooltip content="Mark as resolved">
              <Button variant="glass" size="icon" aria-label="Mark as resolved">
                <Archive />
              </Button>
            </Tooltip>
            <Button
              variant="glass"
              onClick={() =>
                toast("New message from Ayesha", {
                  description: "“Is the bigger plan still on discount?”",
                  action: { label: "Reply", onClick: () => {} },
                })
              }
            >
              <Bell />
              Fire a toast
            </Button>
          </div>
        </Demo>

        <Demo label="Sheet">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="glass">Open contact panel</Button>
            </SheetTrigger>
            <SheetContent>
              <div className="grid gap-1.5 pr-8">
                <SheetTitle>Ayesha Rahman</SheetTitle>
                <SheetDescription>WhatsApp · last active 4 minutes ago</SheetDescription>
              </div>
              <Field label="Display name">
                <Input defaultValue="Ayesha Rahman" />
              </Field>
              <Field label="Phone">
                <Input defaultValue="+880 1711 000000" className="font-mono" />
              </Field>
              <Button className="mt-auto">Save contact</Button>
            </SheetContent>
          </Sheet>
        </Demo>
      </div>
    </Section>
  );
}
