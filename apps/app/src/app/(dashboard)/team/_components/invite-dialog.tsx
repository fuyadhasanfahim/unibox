"use client";

import { inviteMemberSchema, outranksOrEquals, TENANT_ROLES, type TenantRole } from "@repo/shared";
import { Send, UserPlus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/controls";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { ApiError } from "@/lib/api";
import { fieldErrors } from "@/lib/forms";
import { cn } from "@/lib/utils";
import { useInviteMember } from "@/lib/workspaces";
import { ROLE_INFO } from "./role-meta";

export function InviteDialog({ tenantId, myRole }: { tenantId: string; myRole: TenantRole }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TenantRole>("agent");
  const [errors, setErrors] = useState<{ email?: string; role?: string }>({});
  const [formError, setFormError] = useState<string>();
  const invite = useInviteMember(tenantId);

  function reset() {
    setEmail("");
    setRole("agent");
    setErrors({});
    setFormError(undefined);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(undefined);
    const parsed = inviteMemberSchema.safeParse({ email, role });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});

    try {
      const result = await invite.mutateAsync(parsed.data);
      setOpen(false);
      reset();
      if (result.emailSent) {
        toast.success("Invitation sent", { description: `${result.email} has 48 hours to accept.` });
      } else {
        toast.warning("Invitation created, but the email didn't go out", {
          description: "Resend it from the Invitations tab.",
        });
      }
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Couldn't send the invitation. Try again.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <UserPlus />
          Invite people
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <form noValidate onSubmit={onSubmit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Invite to your workspace</DialogTitle>
            <DialogDescription>They&apos;ll get an email with a single-use link that expires in 48 hours.</DialogDescription>
          </DialogHeader>

          <FormAlert message={formError} />

          <Field label="Email" error={errors.email}>
            <Input type="email" autoFocus autoComplete="off" placeholder="teammate@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>

          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">Role</legend>
            <RadioGroup value={role} onValueChange={(v) => setRole(v as TenantRole)} className="grid gap-2 sm:grid-cols-2">
              {[...TENANT_ROLES].reverse().map((r) => {
                const info = ROLE_INFO[r];
                const allowed = outranksOrEquals(myRole, r);
                return (
                  <label
                    key={r}
                    className={cn(
                      "relative flex cursor-pointer gap-3 rounded-xl border border-border p-3 transition-colors",
                      "hover:border-foreground/20 has-[[data-state=checked]]:border-primary/50 has-[[data-state=checked]]:bg-primary-soft",
                      !allowed && "cursor-not-allowed opacity-45 hover:border-border",
                    )}
                  >
                    <RadioGroupItem value={r} disabled={!allowed} aria-label={info.label} className="mt-0.5" />
                    <span className="grid gap-0.5">
                      <span className="flex items-center gap-1.5 text-sm font-semibold">
                        <info.icon className="size-3.5" />
                        {info.label}
                      </span>
                      <span className="text-xs leading-snug text-muted-foreground">
                        {allowed ? info.description : "Above your own role, so you can't grant it."}
                      </span>
                    </span>
                  </label>
                );
              })}
            </RadioGroup>
          </fieldset>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={invite.isPending}>
              {!invite.isPending && <Send />}
              {invite.isPending ? "Sending…" : "Send invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
