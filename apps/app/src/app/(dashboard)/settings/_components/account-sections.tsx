"use client";

import { nameSchema, passwordSchema } from "@repo/shared";
import { KeyRound, Lock, Save, UserRound } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/controls";
import { Field } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/misc";
import { PasswordInput, PasswordStrength } from "@/components/ui/password-input";
import { toast } from "@/components/ui/toaster";
import { authClient } from "@/lib/auth-client";

export function ProfileSection() {
  const { data: session, isPending } = authClient.useSession();
  if (isPending || !session) return <Skeleton className="h-72 rounded-2xl" />;
  // Keyed by the saved name so the form resets to it after each successful save.
  return <ProfileForm key={session.user.name} name={session.user.name} email={session.user.email} image={session.user.image} />;
}

function ProfileForm({ name: savedName, email, image }: { name: string; email: string; image?: string | null }) {
  const [name, setName] = useState(savedName);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const dirty = name.trim() !== savedName;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = nameSchema.safeParse(name);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message);
    setError(undefined);
    setPending(true);
    const { error: err } = await authClient.updateUser({ name: parsed.data });
    setPending(false);
    if (err) return toast.error("Couldn't save your profile.");
    toast.success("Profile updated");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserRound className="size-4 text-primary-text" /> Profile
        </CardTitle>
        <CardDescription>How your teammates see you across every workspace.</CardDescription>
      </CardHeader>
      <form noValidate onSubmit={onSubmit} className="grid gap-5">
        <div className="flex items-center gap-4">
          <Avatar alt={name || savedName} src={image ?? undefined} className="size-16 text-lg" />
          <p className="text-sm text-muted-foreground">Profile photos are coming soon. Your initials are used for now.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Full name" error={error}>
            <Input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Email" hint="Your sign-in address. Contact support to change it.">
            <div className="relative">
              <Input value={email} readOnly aria-readonly className="pr-10 text-muted-foreground" />
              <Lock aria-hidden className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={!dirty} loading={pending}>
            {!pending && <Save />} Save changes
          </Button>
        </div>
      </form>
    </Card>
  );
}

type PwErrors = Partial<Record<"current" | "next" | "confirm", string>>;

export function SecuritySection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [revokeOthers, setRevokeOthers] = useState(true);
  const [errors, setErrors] = useState<PwErrors>({});
  const [formError, setFormError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(undefined);
    const nextErrors: PwErrors = {};
    if (!current) nextErrors.current = "Enter your current password";
    const parsed = passwordSchema.safeParse(next);
    if (!parsed.success) nextErrors.next = parsed.error.issues[0]?.message;
    else if (next === current) nextErrors.next = "Choose a password different from the current one";
    if (next && confirm !== next) nextErrors.confirm = "Passwords don't match";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setPending(true);
    const { error } = await authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: revokeOthers });
    setPending(false);
    if (error) {
      setFormError(
        error.status === 429
          ? "Too many attempts. Wait a minute and try again."
          : error.code === "INVALID_PASSWORD"
            ? "Your current password is incorrect."
            : "Couldn't change your password. Try again.",
      );
      return;
    }
    // Don't keep passwords in memory (this route stays mounted in the background).
    setCurrent("");
    setNext("");
    setConfirm("");
    toast.success("Password changed", { description: revokeOthers ? "Other devices were signed out." : undefined });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-4 text-primary-text" /> Password
        </CardTitle>
        <CardDescription>Use a long passphrase you don&apos;t use anywhere else.</CardDescription>
      </CardHeader>
      <form noValidate onSubmit={onSubmit} className="grid max-w-xl gap-5">
        <FormAlert message={formError} />
        <Field label="Current password" error={errors.current}>
          <PasswordInput autoComplete="current-password" placeholder="Enter your current password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <div className="grid gap-2.5">
          <Field label="New password" error={errors.next} hint="At least 12 characters.">
            <PasswordInput autoComplete="new-password" placeholder="Create a new password" value={next} onChange={(e) => setNext(e.target.value)} />
          </Field>
          <PasswordStrength password={next} />
        </div>
        <Field label="Confirm new password" error={errors.confirm}>
          <PasswordInput autoComplete="new-password" placeholder="Repeat the new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-3.5">
          <div>
            <Label htmlFor="revoke-others">Sign out other devices</Label>
            <p className="mt-1 text-xs text-muted-foreground">Recommended if you think someone else knows your password.</p>
          </div>
          <Switch id="revoke-others" checked={revokeOthers} onCheckedChange={setRevokeOthers} />
        </div>
        <div className="flex justify-end">
          <Button type="submit" loading={pending}>
            {pending ? "Updating…" : "Update password"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
