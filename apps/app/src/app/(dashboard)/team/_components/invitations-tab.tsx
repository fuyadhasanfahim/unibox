"use client";

import { outranksOrEquals, type InvitationDto, type TenantRole } from "@repo/shared";
import { formatDistanceToNowStrict } from "date-fns";
import { Clock, MailPlus, RotateCw, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Empty, Skeleton } from "@/components/ui/misc";
import { toast } from "@/components/ui/toaster";
import { Tooltip } from "@/components/ui/tooltip";
import { ApiError } from "@/lib/api";
import { useInvitations, useInviteMember, useRevokeInvitation } from "@/lib/workspaces";
import { RoleBadge } from "./role-meta";

type Props = { tenantId: string; myRole: TenantRole; canInvite: boolean };

function InvitationRow({ invitation, tenantId, manageable }: { invitation: InvitationDto; tenantId: string; manageable: boolean }) {
  const resend = useInviteMember(tenantId);
  const revoke = useRevokeInvitation(tenantId);
  const [confirm, setConfirm] = useState(false);
  // Clock read once on mount (render must stay pure); good enough for a "soon" hint.
  const [mountedAt] = useState(() => Date.now());
  const expiresSoon = new Date(invitation.expiresAt).getTime() - mountedAt < 6 * 60 * 60 * 1000;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-foreground/[0.02] p-3.5"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-foreground/[0.06] text-muted-foreground">
        <MailPlus className="size-4" />
      </span>
      <div className="grid min-w-0 flex-1 gap-0.5">
        <span className="truncate font-medium">{invitation.email}</span>
        <span className="text-xs text-muted-foreground">
          Invited by {invitation.invitedBy} · {formatDistanceToNowStrict(new Date(invitation.invitedAt), { addSuffix: true })}
        </span>
      </div>
      <RoleBadge role={invitation.role} />
      <span className={expiresSoon ? "inline-flex items-center gap-1 text-xs text-warning" : "inline-flex items-center gap-1 text-xs text-muted-foreground"}>
        <Clock className="size-3" />
        Expires in {formatDistanceToNowStrict(new Date(invitation.expiresAt))}
      </span>
      {manageable && (
        <div className="flex gap-1">
          <Tooltip content="Resend (the old link stops working)">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Resend invitation to ${invitation.email}`}
              loading={resend.isPending}
              onClick={() =>
                resend.mutate(
                  { email: invitation.email, role: invitation.role },
                  {
                    onSuccess: (r) =>
                      r.emailSent ? toast.success(`New invitation sent to ${r.email}`) : toast.warning("Invitation renewed, but the email didn't go out"),
                    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Couldn't resend."),
                  },
                )
              }
            >
              {!resend.isPending && <RotateCw />}
            </Button>
          </Tooltip>
          <Tooltip content="Revoke">
            <Button variant="ghost" size="icon-sm" aria-label={`Revoke invitation to ${invitation.email}`} onClick={() => setConfirm(true)}>
              <X />
            </Button>
          </Tooltip>
        </div>
      )}

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this invitation?</AlertDialogTitle>
            <AlertDialogDescription>The link sent to {invitation.email} stops working right away.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                revoke.mutate(invitation.id, {
                  onSuccess: () => toast.success("Invitation revoked"),
                  onError: (e) => toast.error(e instanceof ApiError ? e.message : "Couldn't revoke."),
                })
              }
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.li>
  );
}

export function InvitationsTab({ tenantId, myRole, canInvite }: Props) {
  const { data, isPending, error } = useInvitations(tenantId);

  if (isPending) {
    return (
      <div className="grid gap-2" aria-busy>
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }
  if (error) return <Empty icon={MailPlus} title="Couldn't load invitations" description={error.message} />;
  if (data.length === 0) {
    return (
      <Empty
        icon={MailPlus}
        title="No pending invitations"
        description={canInvite ? "Invite teammates and they'll show up here until they accept." : "Admins and owners can invite people."}
      />
    );
  }

  return (
    <ul className="grid gap-2">
      <AnimatePresence initial={false}>
        {data.map((inv) => (
          <InvitationRow key={inv.id} invitation={inv} tenantId={tenantId} manageable={canInvite && outranksOrEquals(myRole, inv.role)} />
        ))}
      </AnimatePresence>
    </ul>
  );
}
