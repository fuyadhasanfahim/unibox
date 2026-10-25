"use client";

import { forgotPasswordSchema } from "@repo/shared";
import { ArrowLeft, MailCheck, Send } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { fieldErrors } from "@/lib/forms";
import { AuthFooter, AuthHeader, FormAlert } from "../_components/auth-ui";

const RESEND_COOLDOWN = 30;

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string>();
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  async function send(target: string) {
    setFormError(undefined);
    setPending(true);
    const { error: err } = await authClient.requestPasswordReset({
      email: target,
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setPending(false);
    if (err?.status === 429) {
      setFormError("Too many requests. Wait a few minutes and try again.");
      return;
    }
    // Same outcome whether or not the account exists: no account enumeration.
    setSentTo(target);
    setCooldown(RESEND_COOLDOWN);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) return setError(fieldErrors<{ email: string }>(parsed.error).email);
    setError(undefined);
    void send(parsed.data.email);
  }

  if (sentTo) {
    return (
      <div className="grid gap-6">
        <motion.span
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary-text ring-1 ring-primary/20"
        >
          <MailCheck className="size-6" />
        </motion.span>
        <AuthHeader
          title="Check your inbox"
          description={
            <>
              If an account exists for <span className="font-medium text-foreground">{sentTo}</span>, a reset link is on its way. It
              expires in 30 minutes.
            </>
          }
        />
        <FormAlert message={formError} />
        <Button variant="glass" size="lg" disabled={cooldown > 0} loading={pending} onClick={() => send(sentTo)} className="w-full">
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend link"}
        </Button>
        <AuthFooter>
          <Link href="/sign-in" className="inline-flex items-center gap-1.5 font-medium text-primary-text hover:underline">
            <ArrowLeft className="size-3.5" /> Back to sign in
          </Link>
        </AuthFooter>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={onSubmit} className="grid gap-6">
      <AuthHeader title="Forgot password?" description="Enter your work email and we'll send you a link to choose a new one." />
      <FormAlert message={formError} />
      <Field label="Email" error={error}>
        <Input type="email" autoComplete="email" autoFocus placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Button type="submit" size="lg" loading={pending} className="w-full">
        {!pending && <Send />}
        {pending ? "Sending…" : "Send reset link"}
      </Button>
      <AuthFooter>
        Remembered it?{" "}
        <Link href="/sign-in" className="font-medium text-primary-text hover:underline">
          Sign in
        </Link>
      </AuthFooter>
    </form>
  );
}
