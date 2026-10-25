"use client";

import { acceptInvitationSchema, invitationTokenSchema, type InvitationPreview } from "@repo/shared";
import { formatDistanceToNowStrict } from "date-fns";
import { ArrowRight, LogIn, Lock, MailX, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Empty, Skeleton } from "@/components/ui/misc";
import { PasswordInput, PasswordStrength } from "@/components/ui/password-input";
import { ApiError, api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { fieldErrors } from "@/lib/forms";
import { AuthFooter, AuthHeader, FormAlert } from "../_components/auth-ui";

type Errors = Partial<Record<"name" | "password" | "confirm", string>>;
type LookupState =
  | { status: "loading" }
  | { status: "invalid"; message: string }
  | { status: "ready"; invite: InvitationPreview };

const INVALID = "This invitation link is invalid or has expired. Ask your admin to send a new one.";

export function SignUpForm() {
  const router = useRouter();
  const token = useSearchParams().get("invitation_token") ?? "";
  const wellFormed = invitationTokenSchema.safeParse(token).success;
  const [lookup, setLookup] = useState<LookupState>({ status: "loading" });

  useEffect(() => {
    if (!wellFormed) return;
    let cancelled = false;
    api<InvitationPreview>(`/invites/lookup?token=${encodeURIComponent(token)}`)
      .then((invite) => !cancelled && setLookup({ status: "ready", invite }))
      .catch((e) => !cancelled && setLookup({ status: "invalid", message: e instanceof ApiError && e.status === 400 ? INVALID : "We couldn't check this invitation. Try again in a moment." }));
    return () => {
      cancelled = true;
    };
  }, [token, wellFormed]);

  // Malformed or missing token: no request needed, decide during render.
  const state: LookupState = wellFormed
    ? lookup
    : { status: "invalid", message: token ? INVALID : "You need an invitation link to create an account." };

  if (state.status === "loading") {
    return (
      <div className="grid gap-6" aria-busy>
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    );
  }

  if (state.status === "invalid") {
    return (
      <div>
        <Empty
          icon={MailX}
          title="Invitation required"
          description={state.message}
          action={
            <Link href="/sign-in" className={buttonVariants({ variant: "glass", size: "sm" })}>
              Go to sign in
            </Link>
          }
        />
      </div>
    );
  }

  if (state.invite.accountExists) return <ExistingAccount invite={state.invite} />;

  return (
    <AcceptForm
      token={token}
      invite={state.invite}
      onDone={(signedIn) => router.replace(signedIn ? "/dashboard" : "/sign-in?notice=joined")}
    />
  );
}

// The invited email already has an account: no new password, they sign in and accept from
// /invitations (which only shows invitations for the signed-in user's own email).
function ExistingAccount({ invite }: { invite: InvitationPreview }) {
  const next = `/sign-in?next=${encodeURIComponent("/invitations")}&email=${encodeURIComponent(invite.email)}`;
  return (
    <div className="grid gap-6">
      <AuthHeader
        title="You already have an account"
        description={
          <>
            Sign in as <span className="font-medium text-foreground">{invite.email}</span> to join{" "}
            <span className="font-medium text-foreground">{invite.organizationName}</span>.
          </>
        }
      />
      <div className="glass flex items-center gap-3 rounded-xl p-3.5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-text ring-1 ring-primary/20">
          <UserPlus className="size-4" />
        </span>
        <div className="grid min-w-0 gap-0.5 text-sm">
          <span className="truncate font-semibold">{invite.organizationName}</span>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            Invited by {invite.inviterName}
            <Badge variant="lime" className="capitalize">
              {invite.role}
            </Badge>
          </span>
        </div>
      </div>
      <Link href={next} className={buttonVariants({ size: "lg", className: "w-full" })}>
        <LogIn />
        Sign in to accept
      </Link>
      <AuthFooter>Use the same email address the invitation was sent to.</AuthFooter>
    </div>
  );
}

function AcceptForm({ token, invite, onDone }: { token: string; invite: InvitationPreview; onDone: (signedIn: boolean) => void }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(undefined);
    const parsed = acceptInvitationSchema.safeParse({ token, name, password });
    const next: Errors = parsed.success ? {} : fieldErrors(parsed.error);
    if (password && confirm !== password) next.confirm = "Passwords don't match";
    setErrors(next);
    if (!parsed.success || next.confirm) return;

    setPending(true);
    try {
      const { email } = await api<{ email: string }>("/invites/accept", { method: "POST", body: JSON.stringify(parsed.data) });
      const { error } = await authClient.signIn.email({ email, password });
      // Account exists even if auto sign-in failed (e.g. rate limit): then send them to sign in.
      setPassword("");
      setConfirm("");
      onDone(!error);
    } catch (err) {
      setPending(false);
      setFormError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <form noValidate onSubmit={onSubmit} className="grid gap-6">
      <AuthHeader title="Create your account" description={<>You&apos;re one step away from your team&apos;s inbox.</>} />

      <div className="glass flex items-center gap-3 rounded-xl p-3.5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-text ring-1 ring-primary/20">
          <UserPlus className="size-4" />
        </span>
        <div className="grid min-w-0 gap-0.5 text-sm">
          <span className="truncate">
            <span className="text-muted-foreground">Join </span>
            <span className="font-semibold">{invite.organizationName}</span>
          </span>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            Invited by {invite.inviterName}
            <Badge variant="lime" className="capitalize">
              {invite.role}
            </Badge>
          </span>
        </div>
      </div>

      <FormAlert message={formError} />

      <div className="grid gap-5">
        <Field label="Email" hint={`Invitation expires in ${formatDistanceToNowStrict(new Date(invite.expiresAt))}`}>
          <div className="relative">
            <Input value={invite.email} readOnly aria-readonly className="pr-10 text-muted-foreground" />
            <Lock aria-hidden className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </Field>
        <Field label="Full name" error={errors.name}>
          <Input autoComplete="name" autoFocus placeholder="Ayesha Rahman" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid gap-2.5">
          <Field label="Password" error={errors.password} hint="At least 12 characters. A passphrase works great.">
            <PasswordInput autoComplete="new-password" placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <PasswordStrength password={password} />
        </div>
        <Field label="Confirm password" error={errors.confirm}>
          <PasswordInput autoComplete="new-password" placeholder="Repeat your password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
      </div>

      <Button type="submit" size="lg" loading={pending} className="w-full">
        {pending ? "Creating account…" : "Create account"}
        {!pending && <ArrowRight />}
      </Button>

      <AuthFooter>
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-primary-text hover:underline">
          Sign in
        </Link>
      </AuthFooter>
    </form>
  );
}
