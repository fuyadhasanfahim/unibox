"use client";

import { updateWorkspaceSchema, type WorkspaceDetails, type WorkspaceSummary } from "@repo/shared";
import { format } from "date-fns";
import { ArrowRightLeft, Building2, Check, ChevronsUpDown, Globe2, LogOut, Save, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Field, useField } from "@/components/ui/field";
import { Input, fieldSurface } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/misc";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { ApiError } from "@/lib/api";
import { fieldErrors } from "@/lib/forms";
import { cn } from "@/lib/utils";
import { useLeaveWorkspace, useMembers, useTransferOwnership, useUpdateWorkspace, useWorkspaceDetails } from "@/lib/workspaces";

const errorText = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);

function offsetLabel(timeZone: string) {
  const part = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" })
    .formatToParts(new Date())
    .find((p) => p.type === "timeZoneName");
  return part?.value.replace("GMT", "UTC") ?? "";
}

function TimeZonePicker({ value, onChange, disabled }: { value: string; onChange: (tz: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const field = useField();
  // Built only when the picker opens (≈400 zones; offsets depend on today's DST).
  const zones = useMemo(
    () => (open ? ["UTC", ...Intl.supportedValuesOf("timeZone")].map((tz) => ({ tz, offset: offsetLabel(tz) })) : []),
    [open],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={field?.id}
        aria-describedby={field?.describedBy}
        disabled={disabled}
        className={cn(fieldSurface, "flex h-10 items-center gap-2.5 px-3 text-left")}
      >
        <Globe2 className="size-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate">{value.replaceAll("_", " ")}</span>
        <span className="font-mono text-xs text-muted-foreground">{offsetLabel(value)}</span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-72 p-0">
        <Command>
          <CommandInput placeholder="Search city or region…" />
          <CommandList>
            <CommandEmpty>No time zone found.</CommandEmpty>
            {zones.map(({ tz, offset }) => (
              <CommandItem
                key={tz}
                value={`${tz} ${offset}`}
                onSelect={() => {
                  onChange(tz);
                  setOpen(false);
                }}
              >
                <span className="flex-1 truncate">{tz.replaceAll("_", " ")}</span>
                <span className="font-mono text-xs text-muted-foreground">{offset}</span>
                {tz === value && <Check className="text-primary-text!" />}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function WorkspaceForm({ details, canEdit }: { details: WorkspaceDetails; canEdit: boolean }) {
  const update = useUpdateWorkspace(details.id);
  const [name, setName] = useState(details.name);
  const [timeZone, setTimeZone] = useState(details.timeZone);
  const [errors, setErrors] = useState<{ name?: string; timeZone?: string }>({});
  const dirty = name.trim() !== details.name || timeZone !== details.timeZone;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input = {
      ...(name.trim() !== details.name && { name }),
      ...(timeZone !== details.timeZone && { timeZone }),
    };
    const parsed = updateWorkspaceSchema.safeParse(input);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    update.mutate(parsed.data, {
      onSuccess: () => toast.success("Workspace updated"),
      onError: (err) => toast.error(errorText(err, "Couldn't save workspace settings.")),
    });
  }

  return (
    <Card>
      <CardHeader className="sm:flex sm:items-start sm:justify-between">
        <div className="grid gap-1.5">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="size-4 text-primary-text" /> Workspace
          </CardTitle>
          <CardDescription>Created {format(new Date(details.createdAt), "MMMM d, yyyy")}</CardDescription>
        </div>
        {!canEdit && <Badge variant="outline">Only owners and admins can edit</Badge>}
      </CardHeader>
      <form noValidate onSubmit={onSubmit} className="grid gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Workspace name" error={errors.name}>
            <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} />
          </Field>
          <Field label="Time zone" error={errors.timeZone} hint="Used for follow-up due dates and reports.">
            <TimeZonePicker value={timeZone} onChange={setTimeZone} disabled={!canEdit} />
          </Field>
        </div>
        {canEdit && (
          <div className="flex justify-end">
            <Button type="submit" disabled={!dirty} loading={update.isPending}>
              {!update.isPending && <Save />} Save changes
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
}

function TransferOwnership({ workspace }: { workspace: WorkspaceSummary }) {
  const members = useMembers(workspace.id);
  const transfer = useTransferOwnership(workspace.id);
  const [memberId, setMemberId] = useState<string>();
  const candidates = members.data?.filter((m) => !m.isYou && m.role !== "owner") ?? [];
  const target = candidates.find((m) => m.id === memberId);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center">
      <div className="grid flex-1 gap-1">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <ArrowRightLeft className="size-4" /> Transfer ownership
        </p>
        <p className="text-xs text-muted-foreground">They become owner and you become an admin. You can&apos;t undo this yourself.</p>
      </div>
      <Select value={memberId} onValueChange={setMemberId} disabled={candidates.length === 0}>
        <SelectTrigger aria-label="New owner" className="h-9 sm:w-52">
          <SelectValue placeholder={candidates.length ? "Choose a member" : "No other members"} />
        </SelectTrigger>
        <SelectContent>
          {candidates.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.name} <span className="text-xs capitalize text-muted-foreground">· {m.role}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={!target}>
            Transfer
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Make {target?.name} the owner of {workspace.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They get full control, including managing owners. You&apos;ll stay in the workspace as an admin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                target &&
                transfer.mutate(target.id, {
                  onSuccess: () => toast.success(`${target.name} is now an owner`, { description: "You're an admin now." }),
                  onError: (e) => toast.error(errorText(e, "Couldn't transfer ownership.")),
                })
              }
            >
              Transfer ownership
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function LeaveWorkspace({ workspace }: { workspace: WorkspaceSummary }) {
  const router = useRouter();
  const leave = useLeaveWorkspace(workspace.id);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/[0.04] p-4 sm:flex-row sm:items-center">
      <div className="grid flex-1 gap-1">
        <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
          <LogOut className="size-4" /> Leave workspace
        </p>
        <p className="text-xs text-muted-foreground">
          You lose access to {workspace.name} right away. {workspace.role === "owner" && "If you're the only owner, transfer ownership first."}
        </p>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm">
            Leave
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave {workspace.name}?</AlertDialogTitle>
            <AlertDialogDescription>You&apos;ll need a new invitation to come back.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                leave.mutate(undefined, {
                  onSuccess: () => {
                    toast.success(`You left ${workspace.name}`);
                    router.push("/dashboard");
                  },
                  onError: (e) => toast.error(errorText(e, "Couldn't leave the workspace.")),
                })
              }
            >
              Leave workspace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function WorkspaceSection({ workspace, can }: { workspace: WorkspaceSummary; can: (p: "workspace.update" | "workspace.transfer") => boolean }) {
  const details = useWorkspaceDetails(workspace.id);

  return (
    <div className="grid gap-5">
      {details.data ? (
        // Re-key on save/switch so the form shows the stored values.
        <WorkspaceForm key={`${details.data.id}:${details.data.name}:${details.data.timeZone}`} details={details.data} canEdit={can("workspace.update")} />
      ) : (
        <Skeleton className="h-64 rounded-2xl" />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <TriangleAlert className="size-4" /> Danger zone
          </CardTitle>
          <CardDescription>Changes here affect who controls {workspace.name}.</CardDescription>
        </CardHeader>
        <div className="grid gap-3">
          {can("workspace.transfer") && <TransferOwnership workspace={workspace} />}
          <LeaveWorkspace workspace={workspace} />
        </div>
      </Card>
    </div>
  );
}
