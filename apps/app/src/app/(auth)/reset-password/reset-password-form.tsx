"use client";

import { resetPasswordSchema } from "@repo/shared";
import { KeyRound, LinkIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Empty } from "@/components/ui/misc";
import { PasswordInput, PasswordStrength } from "@/components/ui/password-input";
import { authClient } from "@/lib/auth-client";
import { fieldErrors } from "@/lib/forms";
import { AuthFooter, AuthHeader, FormAlert } from "../_components/auth-ui";

type Errors = Partial<Record<"password" | "confirm", string>>;

function InvalidLink() {
  return (
    <div className="glass rounded-2xl">
      <Empty
        icon={LinkIcon}
        title="This link has expired"
        description="Reset links work once and expire after 30 minutes. Request a fresh one."
        action={
          <Link href="/forgot-password" className={buttonVariants({ size: "sm" })}>
            Request a new link
          </Link>
        }
      />
    </div>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string>();
  const [expired, setExpired] = useState(false);
  const [pending, setPending] = useState(false);

  if (!token || expired) return <InvalidLink />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(undefined);
    const parsed = resetPasswordSchema.safeParse({ token, password });
    const next: Errors = parsed.success ? {} : fieldErrors(parsed.error);
    if (password && confirm !== password) next.confirm = "Passwords don't match";
    setErrors(next);
    if (!parsed.success || next.confirm) return;

    setPending(true);
    const { error } = await authClient.resetPassword({ newPassword: parsed.data.password, token });
    setPending(false);

    if (error) {
      if (error.status === 429) return setFormError("Too many attempts. Wait a minute and try again.");
      // Invalid, used or expired token.
      return setExpired(true);
    }
    router.replace("/sign-in?notice=reset");
  }

  return (
    <form noValidate onSubmit={onSubmit} className="grid gap-6">
      <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary-text ring-1 ring-primary/20">
        <KeyRound className="size-5" />
      </span>
      <AuthHeader title="Choose a new password" description="You'll be signed out on all other devices." />
      <FormAlert message={formError} />
      <div className="grid gap-5">
        <div className="grid gap-2.5">
          <Field label="New password" error={errors.password} hint="At least 12 characters.">
            <PasswordInput autoComplete="new-password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <PasswordStrength password={password} />
        </div>
        <Field label="Confirm new password" error={errors.confirm}>
          <PasswordInput autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
      </div>
      <Button type="submit" size="lg" loading={pending} className="w-full">
        {pending ? "Saving…" : "Update password"}
      </Button>
      <AuthFooter>
        <Link href="/sign-in" className="font-medium text-primary-text hover:underline">
          Back to sign in
        </Link>
      </AuthFooter>
    </form>
  );
}
