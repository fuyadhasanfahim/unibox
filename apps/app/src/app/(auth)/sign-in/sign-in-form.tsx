"use client";

import { signInSchema } from "@repo/shared";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { authClient } from "@/lib/auth-client";
import { fieldErrors, safeNext } from "@/lib/forms";
import { AuthFooter, AuthHeader, FormAlert } from "../_components/auth-ui";

type Errors = Partial<Record<"email" | "password", string>>;

const NOTICES: Record<string, string> = {
  reset: "Password updated. Sign in with your new password.",
  joined: "Welcome aboard! Sign in to continue.",
};

export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const notice = NOTICES[params.get("notice") ?? ""];
  // Prefilled when arriving from an invitation ("sign in to accept"); only a well-formed email is used.
  const [email, setEmail] = useState(() => {
    const fromLink = params.get("email") ?? "";
    return signInSchema.shape.email.safeParse(fromLink).success ? fromLink : "";
  });
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(undefined);
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});

    setPending(true);
    const { error } = await authClient.signIn.email(parsed.data);
    setPending(false);

    if (error) {
      // Same message for unknown email and wrong password: no account enumeration.
      setFormError(
        error.status === 429
          ? "Too many attempts. Wait a minute and try again."
          : "That email and password don't match. Try again or reset your password.",
      );
      return;
    }
    // Next keeps visited routes mounted (cacheComponents/Activity): clear the form so the
    // credentials are not still sitting there after sign-out, and not kept in memory.
    setEmail("");
    setPassword("");
    router.replace(safeNext(params.get("next"), "/dashboard"));
    router.refresh();
  }

  return (
    <form noValidate onSubmit={onSubmit} className="grid gap-6">
      <AuthHeader title="Welcome back" description="Sign in to your team's inbox." />
      <FormAlert message={notice} tone="success" />
      <FormAlert message={formError} />

      <div className="grid gap-5">
        <Field label="Email" error={errors.email}>
          <Input
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="you@company.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((x) => ({ ...x, email: undefined }));
            }}
          />
        </Field>
        <div className="grid gap-2">
          <Field label="Password" error={errors.password}>
            <PasswordInput
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((x) => ({ ...x, password: undefined }));
              }}
            />
          </Field>
          <Link href="/forgot-password" className="justify-self-end text-xs font-medium text-primary-text hover:underline">
            Forgot password?
          </Link>
        </div>
      </div>

      <Button type="submit" size="lg" loading={pending} className="w-full">
        {pending ? "Signing in…" : "Sign in"}
        {!pending && <ArrowRight />}
      </Button>

      <AuthFooter>Unibox is invite-only. Ask your workspace admin for an invitation.</AuthFooter>
    </form>
  );
}
