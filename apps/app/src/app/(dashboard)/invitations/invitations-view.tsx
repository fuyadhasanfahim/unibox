"use client";

import type { MyInvitationDto } from "@repo/shared";
import { formatDistanceToNowStrict } from "date-fns";
import { Check, Clock, MailOpen, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty, Skeleton } from "@/components/ui/misc";
import { toast } from "@/components/ui/toaster";
import { useMounted } from "@/hooks/use-mounted";
import { ApiError } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { useAcceptMyInvitation, useDeclineMyInvitation, useMyInvitations, useSwitchWorkspace } from "@/lib/workspaces";
import { RoleBadge } from "../team/_components/role-meta";

function InvitationCard({ invitation }: { invitation: MyInvitationDto }) {
  const router = useRouter();
  const accept = useAcceptMyInvitation();
  const decline = useDeclineMyInvitation();
  const switchTo = useSwitchWorkspace();
  const busy = accept.isPending || decline.isPending || switchTo.isPending;

  // Promise chain, not mutate() callbacks: this card unmounts as soon as the list refreshes,
  // and TanStack Query skips per-call callbacks of unmounted components.
  async function onAccept() {
    try {
      const joined = await accept.mutateAsync(invitation.id);
      // Open the workspace they just joined; if switching fails they can still pick it later.
      await switchTo.mutateAsync(joined.workspaceId).catch(() => undefined);
      toast.success(`Welcome to ${joined.workspaceName}`, { description: `You joined as ${joined.role}.` });
      router.push("/dashboard");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't accept the invitation.");
    }
  }

  const onDecline = () =>
    decline.mutate(invitation.id, {
      onSuccess: () => toast(`Declined the invitation to ${invitation.workspaceName}`),
      onError: (e) => toast.error(e instanceof ApiError ? e.message : "Couldn't decline the invitation."),
    });

  return (
    <motion.li layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}>
      <Card spotlight className="gap-4 sm:flex-row sm:items-center">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary/50 to-chart-5/40 font-display text-lg font-bold">
          {invitation.workspaceName.charAt(0).toUpperCase()}
        </span>
        <div className="grid min-w-0 flex-1 gap-1">
          <p className="truncate font-display text-lg font-bold">{invitation.workspaceName}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <RoleBadge role={invitation.role} />
            <span>Invited by {invitation.invitedBy}</span>
            <span className="inline-flex items-center gap-1 text-xs">
              <Clock className="size-3" />
              Expires in {formatDistanceToNowStrict(new Date(invitation.expiresAt))}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onDecline} disabled={busy} loading={decline.isPending}>
            {!decline.isPending && <X />}
            Decline
          </Button>
          <Button onClick={() => void onAccept()} disabled={busy} loading={accept.isPending || switchTo.isPending}>
            {!(accept.isPending || switchTo.isPending) && <Check />}
            Accept &amp; join
          </Button>
        </div>
      </Card>
    </motion.li>
  );
}

export function InvitationsView() {
  const mounted = useMounted();
  const { data, isPending, error } = useMyInvitations();
  const { data: session } = authClient.useSession();

  if (!mounted || isPending) {
    return (
      <div className="grid gap-3" aria-busy>
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
    );
  }
  if (error) return <Empty icon={MailOpen} title="Couldn't load invitations" description={error.message} />;

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        Invitations sent to <span className="font-medium text-foreground">{session?.user.email}</span>. Accepting adds you to that workspace
        with the role shown.
      </p>
      {data.length === 0 ? (
        <Card className="min-h-[40vh] items-center justify-center">
          <Empty icon={MailOpen} title="No pending invitations" description="When a workspace invites this email address, it shows up here." />
        </Card>
      ) : (
        <ul className="grid gap-3">
          <AnimatePresence initial={false}>
            {data.map((inv) => (
              <InvitationCard key={inv.id} invitation={inv} />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
